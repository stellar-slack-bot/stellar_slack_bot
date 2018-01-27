const assert = require('assert')
const Slack = require('../src/adapters/slack/slack-adapter')
const Command = require('../src/adapters/commands/command')
const sinon = require('sinon')
const Utils = require('../src/utils')

class TestableSlack extends Slack {
  constructor (config) {
    super(config);
    this.client.sendPlainTextDMToSlackUser = sinon.spy();
  }
}

describe('slackAdapter', async () => {

  let slackAdapter;
  let accountWithWallet;
  let accountWithoutWallet;

  beforeEach(async () => {
    const config = await require('./setup')()
    config.stellar = {
      createTransaction : function() {},
      send : function() {}
    }
    slackAdapter = new TestableSlack(config);
    Account = config.models.account;

    accountWithWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.foo',
      balance: '1.0000000',
      walletAddress: 'GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB'
    });

    accountWithoutWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.bar',
      balance: '1.0000000'
    })
  });

  describe('handle registration request', () => {

    it ('should return a message to be sent back to the user if their wallet fails validation', async () => {
      const badWalletAddress = 'badwalletaddress013934888318';
      let msg = new Command.Register('testing', 'someUserId', badWalletAddress)
      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `${badWalletAddress} is not a valid Public Key / wallet address`);
    })

    it ('should return a message to send back to the user if this user has already registered with that wallet', async () => {
      const sameAddressAsOtherAccount = accountWithWallet.walletAddress
      let msg = new Command.Register('testing', 'team.foo', sameAddressAsOtherAccount)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `You are already using the public key \`${accountWithWallet.walletAddress}\``);
    })

    it ('should send a message back to the user if someone else has already registered with that wallet', async () => {
      let msg = new Command.Register('testing', 'newTeam.someNewUserId', accountWithWallet.walletAddress)
      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Another user has already registered the wallet address \`${accountWithWallet.walletAddress}\`. If you think this is a mistake, please contact @dlohnes on Slack.`);
    })

    // TODO: Make sure this updates the 'updatedAt' value of the Account object
    it (`should overwrite the user's current wallet info if they have a preexisting wallet, and send an appropriate message`, async () => {
      const newWalletId = "GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN"
      const msg = new Command.Register('testing', 'team.foo', newWalletId)
      const returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      const refreshedAccount = await Account.getOrCreate('testing', 'team.foo')
      assert.equal(returnedValue, `Your old wallet \`${accountWithWallet.walletAddress}\` has been replaced by \`${newWalletId}\``);
      assert.equal(refreshedAccount.walletAddress, newWalletId);
    })

    it ('should otherwise save the wallet info to the database for the user and return an appropriate message', async () => {
      const desiredWalletAddress = 'GDO7HAX2PSR6UN3K7WJLUVJD64OK3QLDXX2RPNMMHI7ZTPYUJOHQ6WTN'
      let msg = new Command.Register('testing', 'newTeam.userId', desiredWalletAddress)

      let returnedValue = await slackAdapter.handleRegistrationRequest(msg);
      assert.equal(returnedValue, `Successfully registered with wallet address \`${desiredWalletAddress}\`.\n\nSend XLM deposits to \`${process.env.STELLAR_PUBLIC_KEY}\` to make funds available for use with the '/tip' command.`);
    })
  })

  describe(`handle withdrawal request`, () => {
    it (`should not do the withdrawal and should return an appropriate message if the user is not registered`, async() => {
      let command = new Command.Withdraw('testing', accountWithoutWallet.uniqueId, 1)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, "You must register a wallet address before making a withdrawal, or provide a wallet address as an additional argument");
    })

    it (`should not do the withdrawal and should return an appropriate message if the user provides an invalid public key`, async() => {
      const badWalletAddress = "badWallet"
      let command = new Command.Withdraw('testing', accountWithoutWallet.uniqueId, 1, badWalletAddress)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `\`${badWalletAddress}\` is not a valid public key. Please try again with a valid public key.`);
    })

    it (`should not do the withdrawal and should return an appropriate message if the  user does not have a sufficient balance`, async() => {
      let command = new Command.Withdraw(accountWithWallet.adapter, accountWithWallet.uniqueId, 500.0142)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, "You requested to withdraw \`500.0142 XLM\` but your wallet only contains \`1 XLM\`");
    })

    it (`should complete the withdrawal and should return a message with the amount withdrawn and a transaction receipt if the  user has a sufficient balance`, async() =>
    {
      const transactionHash = "txHash"
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1)
      // A little messy, but the general idea here is that we are getting the command to just
      // return what it would have already been returning, but with its 'withdraw' function's return value pre-determined for testing purposes
      let sourceAccount = await command.getSourceAccount()
      sourceAccount.withdraw = () => {
        return transactionHash
      }
      command.getSourceAccount = () => {
        return sourceAccount;
      }
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `You withdrew \`1 XLM\` to your wallet at \`${accountWithWallet.walletAddress}\`\n\nYour transaction hash is \`${transactionHash}\``);
    })

    it (`should return an appropriate message if the  user supplies a string in place of a number`, async() => {
      let amount = 'asdf'
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, amount)
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `\`${amount}\` is not a valid withdrawal amount. Please try again.`);
    })

    it (`should return an appropriate message if the user supplies a public address that doesn't exist on the chain`, async() => {
      let nonexistantButValidAddress = "GBZKOHL2DJHVNPWWRFCDBDGMC2T5OWNVA33LN7DOY55ETALXU3PBXTN3";
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1, nonexistantButValidAddress)
      slackAdapter.config.stellar = {
        createTransaction: () => new Promise((res, rej) => {
          return rej('DESTINATION_ACCOUNT_DOES_NOT_EXIST')
        })
      }
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `I could not complete your request. The address you tried to withdraw from does not exist.`);
    })

    it (`should return an appropriate message if the user tries to tip out to the tipping bot's wallet address`, async() => {
      // This isn't actually the bot's address, but the var name should tell you "what is going on here" for purposes of testability
      let robotsOwnTippingAddress = "GBZKOHL2DJHVNPWWRFCDBDGMC2T5OWNVA33LN7DOY55ETALXU3PBXTN3";
      let command = new Command.Withdraw('testing', accountWithWallet.uniqueId, 1, robotsOwnTippingAddress)
      slackAdapter.config.stellar = {
        createTransaction: () => new Promise((res, rej) => {
          return rej('TRANSACTION_REFERENCE_ERROR')
        })
      }
      let returnedValue = await slackAdapter.receiveWithdrawalRequest(command);
      assert.equal(returnedValue, `You're not allowed to send money through this interface to the tipping bot. If you'd like to tip the creators, check our repository on GitHub.`);
    })
  })

  describe(`receive potential tip`, () => {
    it (`should return an error message if the user's balance is not high enough`, async() => {
      let amount = 1000
      let command = new Command.Tip('testing', 'team.foo', 'team.new', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert.equal(`Sorry, your tip could not be processed. Your account only contains \`${Utils.formatNumber(accountWithWallet.balance)} XLM\` but you tried to send \`${Utils.formatNumber(amount)} XLM\``, returnedValue)
    })

    it (`should return a koan if the tipper tips them self`, async() => {
      let amount = 1
      let command = new Command.Tip('testing', 'team.foo', 'team.foo', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert.equal(returnedValue, `What is the sound of one tipper tipping?`)
    })

    it (`should return a confirmation message with transaction hash to the tipper once the tip has gone through`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let command = new Command.Tip('testing', 'team.foo', 'team.new', amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      const tippedAccount = await Account.getOrCreate('testing', 'team.new')
      assert.equal(tippedAccount.balance, amount)
      assert.equal(returnedValue, `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``)
    })

    it (`should send a message with detailed sign up instructions to any tip receiver who is not yet registered after the tip goes through`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let recipientId = 'team.bar'
      let command = new Command.Tip('testing', 'team.foo', recipientId, amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert(slackAdapter.client.sendPlainTextDMToSlackUser.calledWith(recipientId,
          `Someone tipped you \`${Utils.formatNumber(amount)} XLM\`\n\nIn order to withdraw your funds, first register your public key by typing /register [your public key]\n\nYou can also tip other users using the /tip command.`), "The client should receive a message telling it to DM the recipient once the tip goes through")
      assert.equal(returnedValue, `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``)    })

    it (`should send a simple message to any tip receiver who has already registered after the tip goes through`, async() => {
      let amount = 0.9128341 // Made this out to seven digits rather than just "1" to ensure robustness in testing
      let recipientId = 'team.foo'
      let command = new Command.Tip('testing', 'team.bar', recipientId, amount)
      let returnedValue = await slackAdapter.receivePotentialTip(command)
      assert(slackAdapter.client.sendPlainTextDMToSlackUser.calledWith(recipientId, `Someone tipped you \`${Utils.formatNumber(amount)} XLM\``), "The client should receive a message telling it to DM the recipient once the tip goes through")
      assert.equal(returnedValue, `You successfully tipped \`${Utils.formatNumber(amount)} XLM\``)
    })
  })

  describe('receive Balance Request', () => {
    it('should return the user`s account balance and instructions on how to register if they are not registered', async () => {
      let balanceCommand = new Command.Balance(accountWithoutWallet.adapter, accountWithoutWallet.uniqueId, accountWithoutWallet.walletAddress)
      const returned = await slackAdapter.receiveBalanceRequest(balanceCommand)
      assert.equal(returned, `Your wallet address is: \`Use the /register command to register your wallet address\`\nYour balance is: \'${accountWithoutWallet.balance}\'`)
    })

    it(`should return the user's wallet address & account balance if they are registered`, async () => {
      let balanceCommand = new Command.Balance(accountWithWallet.adapter, accountWithWallet.uniqueId, accountWithWallet.walletAddress)
      const returned = await slackAdapter.receiveBalanceRequest(balanceCommand)
      assert.equal(returned, `Your wallet address is: \`${accountWithWallet.walletAddress}\`\nYour balance is: \'${accountWithWallet.balance}\'`)
    })
  })

  describe('on deposit', () => {
    it('should send a message to the receiver of a deposit when their deposit goes through', async () => {
      let amount = 5.0
      await slackAdapter.onDeposit(accountWithWallet, amount)
      assert(slackAdapter.client.sendPlainTextDMToSlackUser.calledWith(accountWithWallet.uniqueUserID, `You made a deposit of ${Utils.formatNumber(amount)}`));
    })
  })
})
