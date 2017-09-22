const DelegationProxy = artifacts.require("DelegationProxy.sol")
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory.sol")
const MiniMeToken = artifacts.require("MiniMeToken.sol")
const TestUtils = require("./TestUtils.js")

// TODO: This a very minimal set of tests purely for understanding the contract. I think they can be used though.
contract("DelegationProxy", accounts => {

    let delegationProxy
    const delegateToAccount = accounts[1]
    const delegateFromAccount = accounts[0]

    beforeEach(async () => {
        delegationProxy = await DelegationProxy.new(0)
    })

    describe("delegate(address _to)", () => {

        it("creates Delegate Log event", async () => {
            const tx = await delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
            const delegateArgs = await TestUtils.listenForEvent(delegationProxy.Delegate())

            assert.equal(delegateArgs.who, delegateFromAccount, "Delegate Log shows delegating from isn't sender")
            assert.equal(delegateArgs.to, delegateToAccount, "Delegate Log shows delegating to isn't passed address")
        })

        it("updates delegations mapping with new delegate", async () => {
            const tx = await delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
            const delegations = await delegationProxy.delegations(delegateFromAccount, 0)

            assert.equal(delegations[0], web3.eth.blockNumber, "Delegations block number is incorrect")
            assert.equal(delegations[1], delegateToAccount, "Delegations to account is incorrect")
            // TODO: The below is incorrect, delegations function needs completing
            assert.equal(delegations[2], 0, "Delegations toIndex is incorrect")

        })
    })

    describe("delegatedToAt(address _who, uint _block)", () => {

        it("returns correctly delegated to address", async () => {
            await delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
            const delegatedTo = await delegationProxy.delegatedToAt.call(delegateFromAccount, web3.eth.blockNumber)

            assert.equal(delegatedTo, delegateToAccount, "Delegated to account is incorrect")
        })
    })

    describe("delegatedInfluenceFromAt(address _who, address _token, uint _block)", () => {

        let miniMeTokenFactory, miniMeToken
        const accountBalance = 1000

        beforeEach(async () => {
            miniMeTokenFactory = await MiniMeTokenFactory.new()
            miniMeToken = await MiniMeToken.new(miniMeTokenFactory.address, 0, 0, "TestToken", 18, "TTN", true)
            await miniMeToken.generateTokens(delegateFromAccount, accountBalance)
        })

        it("returns expected amount of influence", async () => {
            await delegationProxy.delegate(delegateToAccount, {from: delegateFromAccount})
            const delegatedInfluence = await delegationProxy.delegatedInfluenceFromAt(delegateToAccount, miniMeToken.address, web3.eth.blockNumber)

            assert.equal(delegatedInfluence.toNumber(), 1000, "Delegated influence is not as expected")
        })
    })
})