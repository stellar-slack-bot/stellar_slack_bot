"use strict"
const utils = require('../../utils')
const AccountInstance = require('../../models/account')

/***
 * Command is used to wrap data related to a command coming from Slack, or theoretically any other platform.
 *
 */
class Command {
  constructor(adapter, sourceId) {
    this.adapter  = adapter;
    this.sourceId = sourceId;
    this.uniqueId = this.sourceId; // alias, allows for interoperability with multiple legacy functions expecting different names for same data
    this.hash     = utils.uuidv4();
  }

  get Account() {
    return AccountInstance.Singleton();
  }

  async getSourceAccount() {
    return await this.Account.getOrCreate(this.adapter, this.sourceId);
  }
}

/**
 * Register is used to allow users to register a wallet against their unique ID for a particular platform
 */
class Register extends Command {
  constructor(adapter, sourceId, walletPublicKey){
    super(adapter, sourceId);
    this.walletPublicKey = walletPublicKey;
    this.type = "register";
  }
}

/**
 * Tip allows users to tip another user
 */
class Tip extends Command {
  constructor(adapter, sourceId, targetId, amount){
    super(adapter, sourceId);
    this.targetId = targetId;
    this.amount   = amount;
    this.type = "tip";
  }

}

/**
 * Withdraw allows users to take XLM out of the tipping bot and be delivered either to their default wallet
 * which was given previously via the Register command, or can also be given as an argument when the Withdraw command is made.
 *
 */
class Withdraw extends Command {
  constructor(adapter, sourceId, amount, address = null){
    super(adapter, sourceId);
    this.amount   = amount;
    this.address  = address;
    this.type = "withdraw";
  }


}


/**
 * Allows the user to check their balance, current wallet address
 */
class Balance extends Command {
  constructor(adapter, sourceId, address = null){
    super(adapter, sourceId);
    this.address = address;
    this.type = "balance";
  }
}

module.exports = { 
  Command,
  Register,
  Tip,
  Withdraw,
  Balance
}