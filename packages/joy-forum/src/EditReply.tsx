import React from 'react';
import { Button, Message } from 'semantic-ui-react';
import { Form, Field, withFormik, FormikProps } from 'formik';
import * as Yup from 'yup';

import TxButton from '@polkadot/joy-utils/TxButton';
import { SubmittableResult } from '@polkadot/api';
import { /* withCalls, */ withMulti } from '@polkadot/ui-api/with';

import * as JoyForms from '@polkadot/joy-utils/forms';
import { AccountId, Text, Bool } from '@polkadot/types';
import { Option } from '@polkadot/types/codec';
import { ReplyId, Reply, ThreadId } from './types';
import { withOnlyMembers } from '@polkadot/joy-utils/MyAccount';
import Section from '@polkadot/joy-utils/Section';
import { useMyAccount } from '@polkadot/joy-utils/MyAccountContext';
import { useForum } from './Context';
import { UrlHasIdProps, CategoryCrumbs } from './utils';

const buildSchema = (p: ValidationProps) => Yup.object().shape({
  text: Yup.string()
    // .min(p.minTextLen, `Reply text is too short. Minimum length is ${p.minTextLen} chars.`)
    // .max(p.maxTextLen, `Reply text is too long. Maximum length is ${p.maxTextLen} chars.`)
    .required('Text is required')
});

type ValidationProps = {
  // minTextLen: number,
  // maxTextLen: number
};

type OuterProps = ValidationProps & {
  id?: ReplyId
  struct?: Reply
  threadId?: ThreadId
};

type FormValues = {
  text: string
};

type FormProps = OuterProps & FormikProps<FormValues>;

const LabelledField = JoyForms.LabelledField<FormValues>();

const InnerForm = (props: FormProps) => {
  const {
    id,
    threadId,
    struct,
    values,
    dirty,
    isValid,
    isSubmitting,
    setSubmitting,
    resetForm
  } = props;

  const {
    text
  } = values;

  const { state: { address } } = useMyAccount();
  const { dispatch } = useForum();

  const onSubmit = (sendTx: () => void) => {
    if (isValid) sendTx();
  };

  const onTxCancelled = () => {
    setSubmitting(false);
  };

  const onTxFailed = (_txResult: SubmittableResult) => {
    setSubmitting(false);
  };

  const onTxSuccess = (_txResult: SubmittableResult) => {
    setSubmitting(false);
  };

  const isNew = struct === undefined;
  const resolvedThreadId = !threadId && struct ? struct.thread_id : threadId;

  const buildTxParams = () => {
    if (!isValid) return [];

    if (isNew) {
      return [ id /* TODO add all required params */ ];
    } else {
      return [ /* TODO add all required params */ ];
    }
  };

  const updateForumContext = () => {
    const reply = new Reply({
      owner: struct ? struct.owner : new AccountId(address),
      thread_id: resolvedThreadId,
      locked: new Bool(false), // TODO update from the form.
      text: new Text(text)
    });
    if (id) {
      dispatch({ type: 'UpdateReply', reply, id: id.toNumber() });
    } else {
      dispatch({ type: 'NewReply', reply });
    }
  };

  const form =
    <Form className='ui form JoyForm EditEntityForm'>

      <LabelledField name='text' {...props}>
        <Field component='textarea' id='text' name='text' disabled={isSubmitting} rows={5} placeholder='Type here. You can use Markdown.' />
      </LabelledField>

      <LabelledField {...props}>

        { /* TODO delete this button once integrated w/ substrate */ }
        <Button
          type='button'
          size='large'
          primary
          disabled={!dirty || isSubmitting}
          onClick={updateForumContext}
          content={isNew
            ? 'Post a reply'
            : 'Update a reply'
          }
        />

        <TxButton
          style={{ display: 'none' }} // TODO delete once integrated w/ substrate
          type='submit'
          size='large'
          label={isNew
            ? 'Post a reply'
            : 'Update a reply'
          }
          isDisabled={!dirty || isSubmitting}
          params={buildTxParams()}
          tx={isNew
            ? 'forum.newReply'
            : 'forum.updateReply'
          }
          onClick={onSubmit}
          txCancelledCb={onTxCancelled}
          txFailedCb={onTxFailed}
          txSuccessCb={onTxSuccess}
        />
        <Button
          type='button'
          size='large'
          disabled={!dirty || isSubmitting}
          onClick={() => resetForm()}
          content='Reset form'
        />
      </LabelledField>
    </Form>;

  const sectionTitle = isNew
    ? 'New reply'
    : 'Edit my reply';

  return <>
    <CategoryCrumbs threadId={resolvedThreadId} />
    <Section className='EditEntityBox' title={sectionTitle}>
      {form}
    </Section>
  </>;
};

const EditForm = withFormik<OuterProps, FormValues>({

  // Transform outer props into form values
  mapPropsToValues: props => {
    const { struct } = props;
    return {
      text: struct && struct.text || ''
    };
  },

  validationSchema: buildSchema,

  handleSubmit: values => {
    // do submitting things
  }
})(InnerForm);

type LoadStructProps = OuterProps & {
  structOpt: Option<Reply>
};

function FormOrLoading (props: LoadStructProps) {
  const { state: { address } } = useMyAccount();
  const { structOpt } = props;

  if (!address || !structOpt) {
    return <em>Loading reply...</em>;
  }

  if (structOpt.isNone) {
    return <em>Reply not found</em>;
  }

  const struct = structOpt.unwrap();
  const isMyStruct = address === struct.owner.toString();

  if (isMyStruct) {
    return <EditForm {...props} struct={struct} />;
  }

  return <Message error className='JoyMainStatus' header='You are not allowed edit this reply.' />;
}

function withThreadIdFromUrl (Component: React.ComponentType<OuterProps>) {
  return function (props: UrlHasIdProps) {
    const { match: { params: { id } } } = props;
    try {
      return <Component threadId={new ThreadId(id)} />;
    } catch (err) {
      return <em>Invalid thread ID: {id}</em>;
    }
  };
}

function withIdFromUrl (Component: React.ComponentType<OuterProps>) {
  return function (props: UrlHasIdProps) {
    const { match: { params: { id } } } = props;
    try {
      return <Component id={new ReplyId(id)} />;
    } catch (err) {
      return <em>Invalid reply ID: {id}</em>;
    }
  };
}

// TODO delete once integrated w/ Substrate's state:
function withLoadStruct (Component: React.ComponentType<OuterProps & LoadStructProps>) {
  return function (props: OuterProps) {
    const { id } = props;
    if (!id) {
      throw new Error('This component requires an id');
    }

    const { state: { replyById } } = useForum();
    const reply = replyById.get(id.toNumber());
    const structOpt: Option<Reply> = new Option(Reply, reply);

    return <Component {...props} structOpt={structOpt} />;
  };
}

export const NewReply = withMulti(
  EditForm,
  withOnlyMembers,
  withThreadIdFromUrl
);

export const EditReply = withMulti(
  FormOrLoading,
  withOnlyMembers,
  withIdFromUrl,
  withLoadStruct

  // TODO Get reply struct from Substrate:
  // , withCalls<OuterProps>(
  //   ['query.forum.replyById',
  //     { paramName: 'id', propName: 'structOpt' } ]
  // )
);
