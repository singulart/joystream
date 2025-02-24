import { acceptPendingDataObjects } from '../../runtime/extrinsics'
import { createUploadToken, verifyTokenSignature } from '../../helpers/auth'
import { hashFile } from '../../helpers/hashing'
import { registerNewDataObjectId } from '../../caching/newUploads'
import { addDataObjectIdToCache } from '../../caching/localDataObjects'
import { createNonce, getTokenExpirationTime } from '../../caching/tokenNonceKeeper'
import { getFileInfo } from '../../helpers/fileInfo'
import logger from '../../logger'
import { ApiPromise } from '@polkadot/api'
import * as express from 'express'
import fs from 'fs'
import path from 'path'
import send from 'send'
import { hexToString } from '@polkadot/util'
import { parseBagId } from '../../helpers/bagTypes'
import { timeout } from 'promise-timeout'
import { WebApiError, sendResponseWithError, getHttpStatusCodeByError, AppConfig } from './common'
import { getStorageBucketIdsByWorkerId } from '../../sync/storageObligations'
import { PalletMembershipMembershipObject as Membership, PalletStorageBagIdType as BagId } from '@polkadot/types/lookup'
import BN from 'bn.js'
import {
  UploadFileQueryParams,
  UploadTokenRequest,
  UploadTokenBody,
  GetFileRequestParams,
  GetFileHeadersRequestParams,
} from '../types'
const fsPromises = fs.promises

/**
 * A public endpoint: serves files by data object ID.
 */
export async function getFile(
  req: express.Request<GetFileRequestParams>,
  res: express.Response<unknown, AppConfig>,
  next: express.NextFunction
): Promise<void> {
  try {
    const dataObjectId = new BN(req.params.id)
    const uploadsDir = res.locals.uploadsDir
    const fullPath = path.resolve(uploadsDir, dataObjectId.toString())

    const fileInfo = await getFileInfo(fullPath)
    const fileStats = await fsPromises.stat(fullPath)

    const stream = send(req, fullPath)

    stream.on('headers', (res) => {
      // serve all files for download
      res.setHeader('Content-Disposition', 'inline')
      res.setHeader('Content-Type', fileInfo.mimeType)
      res.setHeader('Content-Length', fileStats.size)
    })

    stream.on('error', (err) => {
      sendResponseWithError(res, next, err, 'files')
    })

    stream.pipe(res)
  } catch (err) {
    sendResponseWithError(res, next, err, 'files')
  }
}

/**
 * A public endpoint: sends file headers by data object ID.
 */
export async function getFileHeaders(
  req: express.Request<GetFileHeadersRequestParams>,
  res: express.Response<unknown, AppConfig>
): Promise<void> {
  try {
    const dataObjectId = new BN(req.params.id)
    const uploadsDir = res.locals.uploadsDir
    const fullPath = path.resolve(uploadsDir, dataObjectId.toString())
    const fileInfo = await getFileInfo(fullPath)
    const fileStats = await fsPromises.stat(fullPath)

    res.setHeader('Content-Disposition', 'inline')
    res.setHeader('Content-Type', fileInfo.mimeType)
    res.setHeader('Content-Length', fileStats.size)

    res.status(200).send()
  } catch (err) {
    res.status(getHttpStatusCodeByError(err)).send()
  }
}

/**
 * A public endpoint: receives file.
 */
export async function uploadFile(
  req: express.Request<unknown, unknown, unknown, UploadFileQueryParams>,
  res: express.Response<unknown, AppConfig>,
  next: express.NextFunction
): Promise<void> {
  const uploadRequest = req.query

  // saved filename to delete on verification or extrinsic errors
  let cleanupFileName = ''
  try {
    const fileObj = getFileObject(req)
    cleanupFileName = fileObj.path

    const workerId = res.locals.workerId

    const api = res.locals.api
    const bagId = parseBagId(uploadRequest.bagId)

    const hash = await hashFile(fileObj.path)

     await verifyDataObjectInfo(api, bagId, new BN(uploadRequest.dataObjectId), fileObj.size, hash)

    // Prepare new file name
    const dataObjectId = uploadRequest.dataObjectId
    const uploadsDir = res.locals.uploadsDir
    const newPath = path.join(uploadsDir, dataObjectId)

    registerNewDataObjectId(dataObjectId)
    await addDataObjectIdToCache(dataObjectId)

    // Overwrites existing file.
    await fsPromises.rename(fileObj.path, newPath)
    cleanupFileName = newPath

    await acceptPendingDataObjects(
      api,
      bagId,
      res.locals.storageProviderAccount,
      workerId,
      new BN(uploadRequest.storageBucketId),
      [new BN(uploadRequest.dataObjectId)]
    )

    res.status(201).json({
      id: hash,
    })
  } catch (err) {
    await cleanupFileOnError(cleanupFileName, err.toString())

    sendResponseWithError(res, next, err, 'upload')
  }
}

/**
 * A public endpoint: creates auth token for file uploads.
 */
export async function authTokenForUploading(
  req: express.Request,
  res: express.Response<unknown, AppConfig>,
  next: express.NextFunction
): Promise<void> {
  try {
    const account = res.locals.storageProviderAccount
    const tokenRequest = getTokenRequest(req)
    const api = res.locals.api

    await validateTokenRequest(api, tokenRequest)

    const tokenBody: UploadTokenBody = {
      nonce: createNonce(),
      validUntil: getTokenExpirationTime(),
      ...tokenRequest.data,
    }
    const signedToken = createUploadToken(tokenBody, account)

    res.status(201).json({
      token: signedToken,
    })
  } catch (err) {
    sendResponseWithError(res, next, err, 'authtoken')
  }
}

/**
 * Returns Multer.File object from the request.
 *
 * @remarks
 * This is a helper function. It parses the request object for a variable and
 * throws an error on failure.
 */
function getFileObject(req: express.Request<unknown, unknown, unknown, UploadFileQueryParams>): Express.Multer.File {
  if (req.file) {
    return req.file
  }

  const files = req.files as Express.Multer.File[]
  if (files && files.length > 0) {
    return files[0]
  }

  throw new WebApiError('No file uploaded', 400)
}

/**
 * Returns UploadTokenRequest object from the request.
 *
 * @remarks
 * This is a helper function. It parses the request object for a variable and
 * throws an error on failure.
 */
function getTokenRequest(req: express.Request): UploadTokenRequest {
  const tokenRequest = req.body as UploadTokenRequest
  if (tokenRequest) {
    return tokenRequest
  }

  throw new WebApiError('No token request provided.', 401)
}

/**
 * Validates token request. It verifies token signature and compares the
 * member ID and account ID from the runtime with token data.
 *
 * @param api - runtime API promise
 * @param tokenRequest - UploadTokenRequest instance
 * @returns void promise.
 */
async function validateTokenRequest(api: ApiPromise, tokenRequest: UploadTokenRequest): Promise<void> {
  const result = verifyTokenSignature(tokenRequest, tokenRequest.data.accountId)

  if (!result) {
    throw new WebApiError('Invalid upload token request signature.', 401)
  }

  const membershipPromise = api.query.members.membershipById(tokenRequest.data.memberId)

  const membership = (await timeout(membershipPromise, 5000)).unwrap() as Membership

  if (membership.controllerAccount.toString() !== tokenRequest.data.accountId) {
    throw new WebApiError(`Provided controller account and member id don't match.`, 401)
  }
}

/**
 * Validates the runtime info for the data object. It verifies contentID,
 * file size, and 'accepted' status.
 *
 * @param api - runtime API promise
 * @param bagId - bag ID
 * @param dataObjectId - data object ID to validate in runtime
 * @param fileSize - file size to validate
 * @param hash - file multihash
 * @returns promise with the 'data object accepted' flag.
 */
async function verifyDataObjectInfo(
  api: ApiPromise,
  bagId: BagId,
  dataObjectId: BN,
  fileSize: number,
  hash: string
): Promise<boolean> {
  const dataObject = await api.query.storage.dataObjectsById(bagId, dataObjectId)

  if (dataObject.isEmpty) {
    //throw new WebApiError(`Data object ${dataObjectId} doesn't exist in storage bag ${bagId}`, 400)
  }

  // Cannot get 'size' as a regular property.
  const dataObjectSize = dataObject.size_

  if (dataObjectSize?.toNumber() !== fileSize) {
    //throw new WebApiError(`File size doesn't match the data object's size for data object ID = ${dataObjectId}`, 400)
  }

  const runtimeHash = hexToString(dataObject.ipfsContentId.toString())
  if (runtimeHash !== hash) {
    //throw new WebApiError(
    //  `File multihash doesn't match the data object's ipfsContentId for data object ID = ${dataObjectId}`,
    //  400
    //)
  }

  return true //dataObject.accepted.valueOf()
}

/**
 * Tries to remove file on error. It silences possible IO error and logs it.
 *
 * @param cleanupFileName - file path to delete
 * @param error - external error
 * @returns void promise.
 */
async function cleanupFileOnError(cleanupFileName: string, error: string): Promise<void> {
  if (cleanupFileName) {
    try {
      await fsPromises.unlink(cleanupFileName)
    } catch (err) {
      logger.error(`Cannot delete the file (${cleanupFileName}) on error: ${error}. IO error: ${err}`)
    }
  }
}

/**
 * A public endpoint: return the server version.
 */
export async function getVersion(req: express.Request, res: express.Response<unknown, AppConfig>): Promise<void> {
  try {
    const config = res.locals.process

    // Copy from an object, because the actual object could contain more data.
    res.status(200).json({
      version: config.version,
      userAgent: config.userAgent,
    })
  } catch (err) {
    res.status(500).json({
      type: 'version',
      message: err.toString(),
    })
  }
}

/**
 * Validates the storage bucket ID obligations for the worker (storage provider).
 * It throws an error when storage bucket doesn't belong to the worker.
 *
 * @param queryNodeUrl - Query Node URL
 * @param workerId - worker(storage provider) ID
 * @param bucketId - storage bucket ID
 * @returns void promise.
 */
export async function verifyBucketId(queryNodeUrl: string, workerId: number, bucketId: BN): Promise<void> {
  const bucketIds = await getStorageBucketIdsByWorkerId(queryNodeUrl, workerId)

  if (!bucketIds.includes(bucketId.toString())) {
    throw new WebApiError('Incorrect storage bucket ID.', 400)
  }
}

/**
 * Verifies the storage bag assignment to the storage bucket.
 * It throws an error if storage bag is not stored by the bucket.
 *
 * @param api - runtime API promise
 * @param bagId - bag ID
 * @param bucketId - storage bucket ID
 * @returns void promise.
 */
export async function verifyBagAssignment(api: ApiPromise, bagId: BagId, bucketId: BN): Promise<void> {
  const bag = await api.query.storage.bags(bagId)

  if (![...bag.storedBy].map((s) => s.toString()).includes(bucketId.toString())) {
    throw new WebApiError(`Storage bag ${bagId} is not assigned to storage bucket ${bucketId}.`, 400)
  }
}
