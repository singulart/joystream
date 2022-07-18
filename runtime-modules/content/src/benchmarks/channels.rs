#![cfg(feature = "runtime-benchmarks")]

use crate::types::ChannelOwner;
use crate::Module as Pallet;
use crate::{Call, ChannelById, Config};
use frame_benchmarking::benchmarks;
use frame_support::storage::StorageMap;
use frame_support::traits::Get;
use frame_system::RawOrigin;
use sp_runtime::traits::Hash;
use sp_arithmetic::traits::{One, Saturating};
use codec::{Encode};

use super::{
    generate_channel_creation_params, insert_distribution_leader, insert_storage_leader,
    member_funded_account, CreateAccountId, DistributionWorkingGroupInstance,
    StorageWorkingGroupInstance, DEFAULT_MEMBER_ID, MAX_COLABORATOR_IDS, MAX_OBJ_NUMBER,
};

benchmarks! {
    where_clause {
        where
              T: balances::Config,
              T: membership::Config,
              T: storage::Config,
              T: working_group::Config<StorageWorkingGroupInstance>,
              T: working_group::Config<DistributionWorkingGroupInstance>,
              T::AccountId: CreateAccountId,
              T: Config ,
              T: frame_system::Config,
    }

    create_channel {

        let a in 1 .. MAX_COLABORATOR_IDS as u32; //max colaborators

        let b in (T::StorageBucketsPerBagValueConstraint::get().min as u32) ..
            (T::StorageBucketsPerBagValueConstraint::get().max() as u32);

        let c in (T::DistributionBucketsPerBagValueConstraint::get().min as u32) ..
            (T::DistributionBucketsPerBagValueConstraint::get().max() as u32);

        let d in 1 .. MAX_OBJ_NUMBER; //max objs number

        let max_obj_size: u64 = T::MaxDataObjectSize::get();

        let storage_wg_lead_account_id = insert_storage_leader::<T>();

        let distribution_wg_lead_account_id = insert_distribution_leader::<T>();

        let (channel_owner_account_id, channel_owner_member_id) =
            member_funded_account::<T>(DEFAULT_MEMBER_ID);

        let sender = RawOrigin::Signed(channel_owner_account_id);

        let channel_owner = ChannelOwner::Member(channel_owner_member_id);

        let params = generate_channel_creation_params::<T>(
            storage_wg_lead_account_id,
            distribution_wg_lead_account_id,
            a, b, c, d,
            max_obj_size,
        );

    }: _ (sender, channel_owner, params)
    verify {
        let channel_id: T::ChannelId = One::one();
        assert!(ChannelById::<T>::contains_key(&channel_id));
        // channel counter increased
        assert_eq!(
            Pallet::<T>::next_channel_id(),
            channel_id.saturating_add(One::one())
        );
    }

    update_channel_payouts {
        let origin = RawOrigin::Root;
        let (account_id, _) = member_funded_account::<T>(1);
        let hash = <<T as frame_system::Config>::Hashing as Hash>::hash(&"test".encode());
        let params = crate::UpdateChannelPayoutsParameters::<T> {
            commitment: Some(hash),
            payload: Some(crate::ChannelPayoutsPayloadParameters::<T>{
                uploader_account: account_id,
                object_creation_params: storage::DataObjectCreationParameters {
                    size: 1u64,
                    ipfs_content_id: 1_u32.to_be_bytes().as_slice().to_vec(),
                },
                expected_data_object_state_bloat_bond: <T as balances::Config>::Balance::one(),
                expected_data_size_fee: <T as balances::Config>::Balance::one(),
            }),
            min_cashout_allowed: Some(<T as balances::Config>::Balance::one()),
            max_cashout_allowed: Some(<T as balances::Config>::Balance::from(1_000_000u32)),
            channel_cashouts_enabled: Some(true),
        };
    }: _ (origin, params)

    withdraw_from_channel_balance {
        let (channel_owner_account_id, channel_owner_member_id) =
            member_funded_account::<T>(DEFAULT_MEMBER_ID);
        let origin = RawOrigin::Signed(channel_owner_account_id);
        let actor = ContentActor::Member(channel_owner_member_id);
        let params = generate_channel_creation_params::<T>(
            insert_storage_leader::<T>(),
            insert_distribution_leader::<T>(),
            0, 0, 0, 0,
            T::MaxDataObjectSize::get(),
        );

    } _ (origin, actor, channel_id, amount)
}

#[cfg(test)]
pub mod tests {
    use crate::tests::mock::{with_default_mock_builder, Content};
    use frame_support::assert_ok;

    #[test]
    fn update_channel_payouts() {
        with_default_mock_builder(|| {
            assert_ok!(Content::test_benchmark_update_channel_payouts());
        });
    }

    #[test]
    fn create_channel() {
        with_default_mock_builder(|| {
            assert_ok!(Content::test_benchmark_create_channel());
        });
    }
}
