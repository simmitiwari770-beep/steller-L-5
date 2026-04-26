#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol, Vec,
};

#[derive(Clone)]
#[contracttype]
pub enum EscrowStatus {
    Pending = 0,
    Released = 1,
    Refunded = 2,
}

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub id: u64,
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub status: EscrowStatus,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    NextEscrowId,
    Token,
    Escrow(u64),
    EscrowIds,
}

const NEXT_ESCROW_ID: Symbol = symbol_short!("NEXT_ID");
const ESCROW_IDS: Symbol = symbol_short!("ESCR_IDS");
const INSTANCE_BUMP_LEDGER: u32 = 200_000;
const INSTANCE_LIFETIME: u32 = 300_000;
const PERSISTENT_BUMP_LEDGER: u32 = 200_000;
const PERSISTENT_LIFETIME: u32 = 300_000;

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_BUMP_LEDGER, INSTANCE_LIFETIME);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_BUMP_LEDGER, PERSISTENT_LIFETIME);
}

fn get_next_id(env: &Env) -> u64 {
    bump_instance(env);
    env.storage()
        .instance()
        .get(&NEXT_ESCROW_ID)
        .unwrap_or(1_u64)
}

fn set_next_id(env: &Env, next_id: u64) {
    bump_instance(env);
    env.storage().instance().set(&NEXT_ESCROW_ID, &next_id);
}

fn get_escrow_ids(env: &Env) -> Vec<u64> {
    bump_instance(env);
    env.storage()
        .instance()
        .get(&ESCROW_IDS)
        .unwrap_or(Vec::new(env))
}

fn set_escrow_ids(env: &Env, ids: &Vec<u64>) {
    bump_instance(env);
    env.storage().instance().set(&ESCROW_IDS, ids);
}

fn get_token_address(env: &Env) -> Address {
    bump_instance(env);
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .unwrap_or_else(|| panic!("contract not initialized"))
}

fn token_client(env: &Env) -> token::Client<'_> {
    token::Client::new(env, &get_token_address(env))
}

#[contract]
pub struct TrustPayEscrowContract;

#[contractimpl]
impl TrustPayEscrowContract {
    pub fn initialize(env: Env, token: Address) {
        bump_instance(&env);
        if env.storage().instance().has(&DataKey::Token) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Token, &token);
        set_next_id(&env, 1_u64);
        set_escrow_ids(&env, &Vec::new(&env));
    }

    pub fn create_escrow(env: Env, buyer: Address, seller: Address, amount: i128) -> u64 {
        buyer.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        if buyer == seller {
            panic!("buyer and seller must differ");
        }

        let id = get_next_id(&env);
        let escrow = Escrow {
            id,
            buyer: buyer.clone(),
            seller,
            amount,
            status: EscrowStatus::Pending,
        };

        let key = DataKey::Escrow(id);
        env.storage().persistent().set(&key, &escrow);
        bump_persistent(&env, &key);

        let mut ids = get_escrow_ids(&env);
        ids.push_back(id);
        set_escrow_ids(&env, &ids);
        set_next_id(&env, id + 1);

        let contract_address = env.current_contract_address();
        token_client(&env).transfer(&buyer, &contract_address, &amount);

        id
    }

    pub fn release_payment(env: Env, escrow_id: u64) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("escrow not found"));
        bump_persistent(&env, &key);

        escrow.buyer.require_auth();
        match escrow.status {
            EscrowStatus::Pending => {}
            _ => panic!("escrow is not pending"),
        }

        let contract_address = env.current_contract_address();
        token_client(&env).transfer(&contract_address, &escrow.seller, &escrow.amount);

        escrow.status = EscrowStatus::Released;
        env.storage().persistent().set(&key, &escrow);
        bump_persistent(&env, &key);
    }

    pub fn refund_payment(env: Env, escrow_id: u64) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("escrow not found"));
        bump_persistent(&env, &key);

        escrow.buyer.require_auth();
        match escrow.status {
            EscrowStatus::Pending => {}
            _ => panic!("escrow is not pending"),
        }

        let contract_address = env.current_contract_address();
        token_client(&env).transfer(&contract_address, &escrow.buyer, &escrow.amount);

        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&key, &escrow);
        bump_persistent(&env, &key);
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        let key = DataKey::Escrow(escrow_id);
        let escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("escrow not found"));
        bump_persistent(&env, &key);
        escrow
    }

    pub fn list_escrows(env: Env) -> Vec<u64> {
        get_escrow_ids(&env)
    }
}

#[cfg(test)]
mod test;

