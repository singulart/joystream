// This file is part of Substrate.

// Copyright (C) 2022 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! Autogenerated weights for project_token
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2022-10-20, STEPS: `50`, REPEAT: 20, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: Some(Wasm), WASM-EXECUTION: Compiled, CHAIN: Some("dev"), DB CACHE: 1024

// Executed Command:
// ./../target/release/joystream-node
// benchmark
// pallet
// --base-path=/mnt/disks/local-ssd/
// --pallet=project_token
// --extrinsic=*
// --chain=dev
// --steps=50
// --repeat=20
// --execution=wasm
// --template=./../devops/joystream-pallet-weight-template.hbs
// --output=./../runtime-modules/project-token/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use frame_support::{traits::Get, weights::Weight};
use sp_std::marker::PhantomData;

/// Weight functions needed for project_token.
pub trait WeightInfo {
	fn transfer(_o: u32, _m: u32, ) -> Weight;
	fn dust_account() -> Weight;
	fn join_whitelist(_h: u32, ) -> Weight;
	fn purchase_tokens_on_sale() -> Weight;
	fn participate_in_split() -> Weight;
	fn exit_revenue_split() -> Weight;
	fn burn() -> Weight;
}

/// Weights for project_token using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Membership MembershipById (r:2 w:0)
	// Storage: Token TokenInfoById (r:1 w:1)
	// Storage: Token AccountInfoByTokenAndMember (r:2 w:2)
	// Storage: Token BloatBond (r:1 w:0)
	// Storage: System Account (r:2 w:2)
	fn transfer(o: u32, m: u32, ) -> Weight {
		(0 as Weight)
			// Standard Error: 7_000
			.saturating_add((16_066_000 as Weight).saturating_mul(o as Weight))
			// Standard Error: 68_000
			.saturating_add((449_000 as Weight).saturating_mul(m as Weight))
			.saturating_add(T::DbWeight::get().reads(6 as Weight))
			.saturating_add(T::DbWeight::get().reads((2 as Weight).saturating_mul(o as Weight)))
			.saturating_add(T::DbWeight::get().writes(4 as Weight))
			.saturating_add(T::DbWeight::get().writes((1 as Weight).saturating_mul(o as Weight)))
	}
	// Storage: Token TokenInfoById (r:1 w:1)
	// Storage: Token AccountInfoByTokenAndMember (r:1 w:1)
	// Storage: Membership MembershipById (r:1 w:0)
	// Storage: System Account (r:2 w:2)
	fn dust_account() -> Weight {
		(63_410_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(5 as Weight))
			.saturating_add(T::DbWeight::get().writes(4 as Weight))
	}
	// Storage: Membership MembershipById (r:1 w:0)
	// Storage: Token TokenInfoById (r:1 w:1)
	// Storage: Token AccountInfoByTokenAndMember (r:1 w:1)
	// Storage: Token BloatBond (r:1 w:0)
	// Storage: System Account (r:2 w:2)
	fn join_whitelist(h: u32, ) -> Weight {
		(81_601_000 as Weight)
			// Standard Error: 23_000
			.saturating_add((1_010_000 as Weight).saturating_mul(h as Weight))
			.saturating_add(T::DbWeight::get().reads(6 as Weight))
			.saturating_add(T::DbWeight::get().writes(4 as Weight))
	}
	// Storage: Membership MembershipById (r:1 w:0)
	// Storage: Token TokenInfoById (r:1 w:1)
	// Storage: Token SalePlatformFee (r:1 w:0)
	// Storage: Token AccountInfoByTokenAndMember (r:1 w:1)
	// Storage: Token BloatBond (r:1 w:0)
	// Storage: System Account (r:3 w:3)
	fn purchase_tokens_on_sale() -> Weight {
		(112_750_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(8 as Weight))
			.saturating_add(T::DbWeight::get().writes(5 as Weight))
	}
	// Storage: Membership MembershipById (r:1 w:0)
	// Storage: Token TokenInfoById (r:1 w:1)
	// Storage: Token AccountInfoByTokenAndMember (r:1 w:1)
	// Storage: System Account (r:2 w:2)
	fn participate_in_split() -> Weight {
		(76_310_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(5 as Weight))
			.saturating_add(T::DbWeight::get().writes(4 as Weight))
	}
	// Storage: Membership MembershipById (r:1 w:0)
	// Storage: Token TokenInfoById (r:1 w:0)
	// Storage: Token AccountInfoByTokenAndMember (r:1 w:1)
	fn exit_revenue_split() -> Weight {
		(42_400_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(3 as Weight))
			.saturating_add(T::DbWeight::get().writes(1 as Weight))
	}
	// Storage: Membership MembershipById (r:1 w:0)
	// Storage: Token TokenInfoById (r:1 w:1)
	// Storage: Token AccountInfoByTokenAndMember (r:1 w:1)
	fn burn() -> Weight {
		(43_910_000 as Weight)
			.saturating_add(T::DbWeight::get().reads(3 as Weight))
			.saturating_add(T::DbWeight::get().writes(2 as Weight))
	}
}

// Default implementation for tests
impl WeightInfo for () {
	fn transfer(o: u32, m: u32, ) -> Weight {
		0
	}
	fn dust_account() -> Weight {
		0
	}
	fn join_whitelist(h: u32, ) -> Weight {
		0
	}
	fn purchase_tokens_on_sale() -> Weight {
		0
	}
	fn participate_in_split() -> Weight {
		0
	}
	fn exit_revenue_split() -> Weight {
		0
	}
	fn burn() -> Weight {
		0
	}
}
