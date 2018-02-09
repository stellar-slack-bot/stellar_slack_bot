const AbstractLogger = require('./abstract-logger')
const MixPanel = require('mixpanel')
const Utils = require('../utils')
var mixpanel = process.env.MIXPANEL_TOKEN ? MixPanel.init(process.env.MIXPANEL_TOKEN, {
  protocol: 'https'
}) : null;

class TipAnalytics extends AbstractLogger {

  constructor() {
    super()

    this.MessagingEvents = {
      onTipReceivedMessageSent(tip, userIsRegistered) {

        let data = TipAnalytics.getTipAnalyticsBase(tip)
        data.userIsRegistered = userIsRegistered
        if(mixpanel) mixpanel.track('message sent received tip', data)
      },

      onDepositReceiptMessageSent(account) {
        let data = TipAnalytics.getAccountAnalyticsBase(account)
        if(mixpanel) mixpanel.track('message sent received tip', data)
      }
    },

    this.OAuthEvents = {

      onOAuthAddEmptyOAuthToken(adapter, blob) {
        let data = TipAnalytics.getOAuthAnalyticsBase(adapter, blob)
        if(mixpanel) mixpanel.track('added missing oauth token', data)
      },

      onAddedNewAuthToken(adapter, blob) {
        let data = TipAnalytics.getOAuthAnalyticsBase(adapter, blob)
        if(mixpanel) mixpanel.track('added new oauth token', data)
      },

      onAddingOAuthFailed(adapter, blob, exception) {
        let data = TipAnalytics.getOAuthAnalyticsBase(adapter, blob)
        data = Object.assign(data, exception)
        if(mixpanel) mixpanel.track('oauth add failed', data)
      },
    }

    this.CommandEvents = {
      /**
       *
       * @param tip {Tip}
       * @param amount
       */
      onTipWithInsufficientBalance(tip, balance) {
        let data = TipAnalytics.getTipAnalyticsBase(tip)
        data.balance = balance
        if(mixpanel) mixpanel.track('tip with insufficient balance', data)
      },

      onTipTransferFailed(tip) {
        let data = TipAnalytics.getTipAnalyticsBase(tip)
        if(mixpanel) mixpanel.track('tip transfer failed', data)
      },

      onUserAttemptedToTipThemself(tip) {
        let data = TipAnalytics.getTipAnalyticsBase(tip)
        if(mixpanel) mixpanel.track('user attempted to tip themself', data)
      },

      onTipNoTargetFound(tip) {
        let data = TipAnalytics.getTipAnalyticsBase(tip)
        if(mixpanel) mixpanel.track('tip no target found for id', data)
      },

      onTipSuccess(tip, amount) {
        let data = TipAnalytics.getTipAnalyticsBase(tip)
        if(mixpanel) mixpanel.track('tip success', data)
      },

      onWithdrawalNoAddressProvided(withdrawal) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track('withdrawal no address provided', data)
      },

      onWithdrawalAttemptedToRobotTippingAddress(withdrawal) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track(`withdrawal attempted with robot's tipping address`, data)
      },

      onWithdrawalDestinationAccountDoesNotExist(withdrawal) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track('withdrawal destination account does not exist', data)
      },

      onWithdrawalInsufficientBalance(withdrawal, balance) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track('withdrawal insufficient balance', data)
      },

      onWithdrawalBadlyFormedAddress(withdrawal, badWalletAddress) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track('withdrawal no address provided', data)
      },

      onWithdrawalSubmissionToHorizonFailed(withdrawal) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track('withdrawal submission to horizon failed', data)
      },

      onWithdrawalInvalidAmountProvided(withdrawal) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        if(mixpanel) mixpanel.track('withdrawal invalid amount', data)
      },

      onWithdrawalSuccess(withdrawal, address, txHash) {
        let data = TipAnalytics.getWithdrawalAnalyticsBase(withdrawal)
        data.address = address
        data.txHash = txHash
        if(mixpanel) mixpanel.track('withdrawal success', data)
      },

      onDepositSuccess(sourceAccount, amount) {
        let data = TipAnalytics.getAccountAnalyticsBase(sourceAccount)
        data.amount = amount
        if(mixpanel) mixpanel.track('deposit success', data)
      },

      onBalanceRequest(balanceCmd, userIsRegistered) {
        let data = TipAnalytics.getBalanceAnalyticsBase(balanceCmd)
        data.userIsRegistered = userIsRegistered
        if(mixpanel) mixpanel.track('balance request made', data)
      },

      onInfoRequest(infoCmd, userIsRegistered) {
        let data = TipAnalytics.getInfoAnalyticsBase(infoCmd)
        data.userIsRegistered = userIsRegistered
        if(mixpanel) mixpanel.track('info request made', data)
      },

      onRegisteredWithBadWallet(registration) {
        let data = TipAnalytics.getRegistrationAnalyticsBase(registration)
        if(mixpanel) mixpanel.track('registration with bad wallet', data)
      },

      onRegisteredWithCurrentWallet(registration) {
        let data = TipAnalytics.getRegistrationAnalyticsBase(registration)
        if(mixpanel) mixpanel.track('registration with current wallet', data)
      },

      onRegisteredWithWalletRegisteredToOtherUser(registration, otherUser) {
        let data = Object.assign(TipAnalytics.getRegistrationAnalyticsBase(registration), {
          otherUser_uniqueId: otherUser.uniqueId,
          otherUser_balance: otherUser.balance,
          otherUser_createdAt: otherUser.createdAt,
          otherUser_adapter: otherUser.adapter
        })
        if(mixpanel) mixpanel.track('registration with wallet registered to other user', data)
      },

      onRegisteredWithRobotsWalletAddress(registration) {
        let data = TipAnalytics.getRegistrationAnalyticsBase(registration)
        if(mixpanel) mixpanel.track(`registration with robots wallet address`, data)
      },

      onRegisteredSuccessfully(registration, isFirstRegistration) {
        let data = Object.assign(TipAnalytics.getRegistrationAnalyticsBase(registration), {
          isFirstRegistration: isFirstRegistration
        })
        if(mixpanel) mixpanel.track('registration success', data)
      },

      onRegistrationSentTermsAgreement(registration) {
        let data = TipAnalytics.getRegistrationAnalyticsBase(registration)
        if(mixpanel) mixpanel.track('registration sent terms agreement', data)
      }
    }
  }

  /**
   *
   * @param command {Command}
   * @returns {Object}
   */
  static getCommandAnalyticsBase(command) {
    return {
      time: new Date(),
      sourceId: command.uniqueId,
      adapter: command.adapter,
      hash: command.hash,
      type: command.type,
      teamId: Utils.slackTeamIdFromUniqueId(command.uniqueId)
    }
  }

  /**
   *
   * @param tip {Tip}
   * @returns {Object}
   */
  static getTipAnalyticsBase(tip) {
    return Object.assign(TipAnalytics.getCommandAnalyticsBase(tip), {
      amount: tip.amount,
      targetId: tip.targetId
    })
  }

  /**
   *
   * @param withdrawal {Withdraw}
   * @returns {Object}
   */
  static getWithdrawalAnalyticsBase(withdrawal) {
    return Object.assign(TipAnalytics.getCommandAnalyticsBase(withdrawal), {
      amount: withdrawal.amount,
      address: withdrawal.address
    })
  }

  /**
   *
   * @param balance {Register}
   * @returns {Object}
   */
  static getBalanceAnalyticsBase(balance) {
    return Object.assign(TipAnalytics.getCommandAnalyticsBase(balance), {
      address: balance.walletPublicKey,
    })
  }

  /**
   *
   * @param balance {Info}
   * @returns {Object}
   */
  static getInfoAnalyticsBase(info) {
    return TipAnalytics.getCommandAnalyticsBase(info)
  }

  /**
   *
   * @param register {Register}
   * @returns {Object}
   */
  static getRegistrationAnalyticsBase(register) {
    return Object.assign(TipAnalytics.getCommandAnalyticsBase(register), {
      walletAddress: register.walletPublicKey,
    })
  }

  static getAccountAnalyticsBase(account) {
    return {
      time: new Date(),
      account_uniqueId: account.uniqueId,
      account_createdAt: account.createdAt,
      account_balance: account.balance,
      account_address: account.walletAddress
    }
  }


  /**
   *
   * @param adapter {String} The adapter we are calling from
   * @param blob {Object} A package of key-value pairs that we want to add to the analytics call
   * @returns {Object}
   */
  static getOAuthAnalyticsBase(adapter, blob) {
    return Object.assign(blob, {
      time: new Date(),
      adapter: adapter
    })
  }

}

module.exports = new TipAnalytics()