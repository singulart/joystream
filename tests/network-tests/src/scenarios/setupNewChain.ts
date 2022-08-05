import leaderSetup from '../flows/working-groups/leadOpening'
import initFaucet from '../flows/faucet/initFaucet'
import initStorage, { singleBucketConfig as defaultStorageConfig } from '../flows/storage/initStorage'
import initDistribution, { singleBucketConfig as defaultDistributionConfig } from '../flows/storage/initDistribution'
import { scenario } from '../Scenario'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
scenario('Setup new chain', async ({ job }) => {
  job('Initialize Faucet', initFaucet)

  if (!process.env.SKIP_STORAGE_AND_DISTRIBUTION) {
    const leads = job('Set WorkingGroup Leads', leaderSetup(true, ['storageWorkingGroup', 'distributionWorkingGroup']))
    job('initialize storage system', initStorage(defaultStorageConfig)).requires(leads)
    job('initialize distribution system', initDistribution(defaultDistributionConfig)).requires(leads)
  }
})
