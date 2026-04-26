#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, TokenAdminClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    (
        TokenClient::new(env, &contract_address),
        TokenAdminClient::new(env, &contract_address),
    )
}

#[test]
fn test_escrow_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let admin = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);

    // Mint tokens to buyer
    token_admin.mint(&buyer, &1000);

    let contract_id = env.register(TrustPayEscrowContract, ());
    let client = TrustPayEscrowContractClient::new(&env, &contract_id);

    client.initialize(&token.address);

    // Create Escrow
    let escrow_id = client.create_escrow(&buyer, &seller, &100);

    // Verify balances after escrow creation
    assert_eq!(token.balance(&buyer), 900);
    assert_eq!(token.balance(&contract_id), 100);

    // Check escrow details
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.seller, seller);
    assert_eq!(escrow.amount, 100);
    match escrow.status {
        EscrowStatus::Pending => (),
        _ => panic!("Expected Pending status"),
    }

    // Release Payment
    client.release_payment(&escrow_id);

    // Verify balances after release
    assert_eq!(token.balance(&contract_id), 0);
    assert_eq!(token.balance(&seller), 100);

    let released_escrow = client.get_escrow(&escrow_id);
    match released_escrow.status {
        EscrowStatus::Released => (),
        _ => panic!("Expected Released status"),
    }
}

#[test]
fn test_refund_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let admin = Address::generate(&env);

    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&buyer, &1000);

    let contract_id = env.register(TrustPayEscrowContract, ());
    let client = TrustPayEscrowContractClient::new(&env, &contract_id);

    client.initialize(&token.address);

    let escrow_id = client.create_escrow(&buyer, &seller, &200);

    assert_eq!(token.balance(&buyer), 800);
    assert_eq!(token.balance(&contract_id), 200);

    // Refund Payment
    client.refund_payment(&escrow_id);

    assert_eq!(token.balance(&contract_id), 0);
    assert_eq!(token.balance(&buyer), 1000);

    let refunded_escrow = client.get_escrow(&escrow_id);
    match refunded_escrow.status {
        EscrowStatus::Refunded => (),
        _ => panic!("Expected Refunded status"),
    }
}
