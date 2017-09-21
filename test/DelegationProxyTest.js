const DelegationProxy = artifacts.require("DelegationProxy.sol")
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory.sol")
const MiniMeToken = artifacts.require("MiniMeToken.sol")
const TestUtils = require("./TestUtils.js")

// TODO: This a very minimal set of tests purely for understanding the contract. I think they can be used though.
contract("DelegationProxy", accounts => {

    let delegationProxy
    const delegateToAccount = accounts[1]
    const delegateFromAccount = accounts[0]

    beforeEach(() => {
        return DelegationProxy.new(0)
            .then(_delegationProxy => delegationProxy = _delegationProxy)
    })

    describe("delegate(address _to)", () => {

        it("creates Delegate Log event", () => {
            return delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
                .then(tx => TestUtils.listenForEvent(delegationProxy.Delegate()))
                .then(delegateArgs => {
                    assert.equal(delegateArgs.who, delegateFromAccount, "Delegate Log shows delegating from isn't sender")
                    assert.equal(delegateArgs.to, delegateToAccount, "Delegate Log shows delegating to isn't passed address")
                })
        })

        it("updates delegations mapping with new delegate", () => {
            return delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
                .then(tx => delegationProxy.delegations(delegateFromAccount, 0))
                .then(delegations => {
                    assert.equal(delegations[0], web3.eth.blockNumber, "Delegations block number is incorrect")
                    assert.equal(delegations[1], delegateToAccount, "Delegations to account is incorrect")
                    // TODO: The below is incorrect, delegations function needs completing
                    assert.equal(delegations[2], 0, "Delegations toIndex is incorrect")
                })
        })
    })

    describe("delegatedToAt(address _who, uint _block)", () => {

        it("returns correctly delegated to address", () => {
            return delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
                .then(() => delegationProxy.delegatedToAt.call(delegateFromAccount, web3.eth.blockNumber))
                .then(delegatedTo => assert.equal(delegatedTo, delegateToAccount, "Delegated to account is incorrect"))
        })
    })

    describe("delegatedInfluenceFromAt(address _who, address _token, uint _block)", () => {

        let miniMeTokenFactory, miniMeToken
        const accountBalance = 1000

        beforeEach(() => {
            return MiniMeTokenFactory.new()
                .then(_miniMeTokenFactory => {
                    miniMeTokenFactory = _miniMeTokenFactory
                    return MiniMeToken.new(miniMeTokenFactory.address, 0, 0, "TestToken", 18, "TTN", true)
                })
                .then(_miniMeToken => {
                    miniMeToken = _miniMeToken
                    return miniMeToken.generateTokens(delegateFromAccount, accountBalance)
                })
        })

        it("returns expected amount of influence", () => {
            return delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
                .then(() => delegationProxy.delegatedInfluenceFromAt(delegateFromAccount, miniMeToken.address, web3.eth.blockNumber))
                .then(delegatedInfluence => assert.equal(delegatedInfluence.toNumber(), 1000, "Delegated influence is not as expected"))
        })
    })
})