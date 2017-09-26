const DelegationProxy = artifacts.require("DelegationProxy.sol")
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory.sol")
const MiniMeToken = artifacts.require("MiniMeToken.sol")
const TestUtils = require("./TestUtils.js")

// TODO: This a very minimal set of tests purely for understanding the contract. I think they can be used though.
contract("DelegationProxy", accounts => {

    //Initialize global/common contracts for all tests
    let miniMeTokenFactory
    before(async () => { 
        miniMeTokenFactory = await MiniMeTokenFactory.new()
    });
    
    describe("test individual functionalities", () => {
    
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

            let miniMeToken
            const accountBalance = 1000

            beforeEach(async () => {
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

    describe("scenarios", ()  => {

        let miniMeToken
        const tokenBalance = 1000

        before(async () => {   
            miniMeToken = await MiniMeToken.new(miniMeTokenFactory.address, 0, 0, "TestToken", 18, "TTN", true)
            miniMeToken.generateTokens(accounts[0], tokenBalance)
            miniMeToken.generateTokens(accounts[1], tokenBalance)
            miniMeToken.generateTokens(accounts[2], tokenBalance)
            miniMeToken.generateTokens(accounts[3], tokenBalance)
            miniMeToken.generateTokens(accounts[4], tokenBalance)
            await miniMeToken.generateTokens(accounts[5], tokenBalance)

        });


        describe("delegation multilevel scenario", () => {

            let delegationProxy = []
            const delegateTo = [
                [
                    accounts[1],
                    accounts[2],
                    0x0],
                [
                    0x0,
                    accounts[2],
                    0x0]
                ]
        
            before(async () => {
                delegationProxy[0] = await DelegationProxy.new(0)
                delegationProxy[0].delegate(delegateTo[0][0], {from: accounts[0]})
                delegationProxy[0].delegate(delegateTo[0][1], {from: accounts[1]})
                delegationProxy[0].delegate(delegateTo[0][2], {from: accounts[2]})

                delegationProxy[1] = await DelegationProxy.new(delegationProxy[0].address)
                delegationProxy[1].delegate(delegateTo[1][0], {from: accounts[0]})
                delegationProxy[1].delegate(delegateTo[1][1], {from: accounts[1]})
                delegationProxy[1].delegate(delegateTo[1][2], {from: accounts[2]})
     
            })

            it("returns expected delegatedToAt", async () => {
                let delegatedTo = [[],[]]
                delegatedTo[0][0] = await delegationProxy[0].delegatedToAt(accounts[0], web3.eth.blockNumber)
                delegatedTo[0][1] = await delegationProxy[0].delegatedToAt(accounts[1], web3.eth.blockNumber)
                delegatedTo[0][2] = await delegationProxy[0].delegatedToAt(accounts[2], web3.eth.blockNumber)
                delegatedTo[1][0] = await delegationProxy[1].delegatedToAt(accounts[0], web3.eth.blockNumber)
                delegatedTo[1][1] = await delegationProxy[1].delegatedToAt(accounts[1], web3.eth.blockNumber)
                delegatedTo[1][2] = await delegationProxy[1].delegatedToAt(accounts[2], web3.eth.blockNumber)
                
                assert.equal(delegatedTo[0][0], delegateTo[0][0], "delegationProxy[0].delegatedToAt(accounts[0] is not as expected")
                assert.equal(delegatedTo[0][1], delegateTo[0][1], "delegationProxy[0].delegatedToAt(accounts[1] is not as expected")
                assert.equal(delegatedTo[0][2], delegateTo[0][2], "delegationProxy[0].delegatedToAt(accounts[2] is not as expected")
                assert.equal(delegatedTo[1][0], delegateTo[1][0], "delegationProxy[1].delegatedToAt(accounts[0] is not as expected")
                assert.equal(delegatedTo[1][1], delegateTo[1][1], "delegationProxy[1].delegatedToAt(accounts[1] is not as expected")
                assert.equal(delegatedTo[1][2], delegateTo[1][2], "delegationProxy[1].delegatedToAt(accounts[2] is not as expected")
            })
            
            it("returns expected delegationOfAt", async () => {
                let delegationOf = [[],[]]
                delegationOf[0][0] = await delegationProxy[0].delegationOfAt(accounts[0], web3.eth.blockNumber)
                delegationOf[0][1] = await delegationProxy[0].delegationOfAt(accounts[1], web3.eth.blockNumber)
                delegationOf[0][2] = await delegationProxy[0].delegationOfAt(accounts[2], web3.eth.blockNumber)
                delegationOf[1][0] = await delegationProxy[1].delegationOfAt(accounts[0], web3.eth.blockNumber)
                delegationOf[1][1] = await delegationProxy[1].delegationOfAt(accounts[1], web3.eth.blockNumber)
                delegationOf[1][2] = await delegationProxy[1].delegationOfAt(accounts[2], web3.eth.blockNumber)
                
                assert.equal(delegationOf[0][0], accounts[2], "delegationProxy[0].delegationOfAt(accounts[0] is not as expected")
                assert.equal(delegationOf[0][1], accounts[2], "delegationProxy[0].delegationOfAt(accounts[1] is not as expected")
                assert.equal(delegationOf[0][2], accounts[2], "delegationProxy[0].delegationOfAt(accounts[2] is not as expected")
                assert.equal(delegationOf[1][0], accounts[0], "delegationProxy[1].delegationOfAt(accounts[0] is not as expected")
                assert.equal(delegationOf[1][1], accounts[2], "delegationProxy[1].delegationOfAt(accounts[1] is not as expected")
                assert.equal(delegationOf[1][2], accounts[2], "delegationProxy[1].delegationOfAt(accounts[2] is not as expected")
                            
            })

            it("returns expected delegatedInfluenceFromAt", async () => {
                
                let delegatedInfluence = [[],[]]
                delegatedInfluence[0][0] = await delegationProxy[0].delegatedInfluenceFromAt(accounts[0], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluence[0][1] = await delegationProxy[0].delegatedInfluenceFromAt(accounts[1], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluence[0][2] = await delegationProxy[0].delegatedInfluenceFromAt(accounts[2], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluence[1][0] = await delegationProxy[1].delegatedInfluenceFromAt(accounts[0], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluence[1][1] = await delegationProxy[1].delegatedInfluenceFromAt(accounts[1], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluence[1][2] = await delegationProxy[1].delegatedInfluenceFromAt(accounts[2], miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(delegatedInfluence[0][0].toNumber(), 0 * tokenBalance, "delegationProxy[0].delegatedInfluenceFrom(accounts[0] is not as expected")
                assert.equal(delegatedInfluence[0][1].toNumber(), 1 * tokenBalance, "delegationProxy[0].delegatedInfluenceFrom(accounts[1] is not as expected")
                assert.equal(delegatedInfluence[0][2].toNumber(), 2 * tokenBalance, "delegationProxy[0].delegatedInfluenceFrom(accounts[2] is not as expected")
                assert.equal(delegatedInfluence[1][0].toNumber(), 0 * tokenBalance, "delegationProxy[1].delegatedInfluenceFrom(accounts[0] is not as expected")
                assert.equal(delegatedInfluence[1][1].toNumber(), 0 * tokenBalance, "delegationProxy[1].delegatedInfluenceFrom(accounts[1] is not as expected")
                assert.equal(delegatedInfluence[1][2].toNumber(), 1 * tokenBalance, "delegationProxy[1].delegatedInfluenceFrom(accounts[2] is not as expected")
            })
            
            it("returns expected influenceOfAt", async () => {
    
                let influence = [[],[]]
                influence[0][0] = await delegationProxy[0].influenceOfAt(accounts[0], miniMeToken.address, web3.eth.blockNumber)
                influence[0][1] = await delegationProxy[0].influenceOfAt(accounts[1], miniMeToken.address, web3.eth.blockNumber)
                influence[0][2] = await delegationProxy[0].influenceOfAt(accounts[2], miniMeToken.address, web3.eth.blockNumber)
                influence[1][0] = await delegationProxy[1].influenceOfAt(accounts[0], miniMeToken.address, web3.eth.blockNumber)
                influence[1][1] = await delegationProxy[1].influenceOfAt(accounts[1], miniMeToken.address, web3.eth.blockNumber)
                influence[1][2] = await delegationProxy[1].influenceOfAt(accounts[2], miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(influence[0][0].toNumber(), 0 * tokenBalance, "delegationProxy[0].influenceOfAt(accounts[0] is not as expected")
                assert.equal(influence[0][1].toNumber(), 0 * tokenBalance, "delegationProxy[0].influenceOfAt(accounts[1] is not as expected")
                assert.equal(influence[0][2].toNumber(), 3 * tokenBalance, "delegationProxy[0].influenceOfAt(accounts[2] is not as expected")
                assert.equal(influence[1][0].toNumber(), 1 * tokenBalance, "delegationProxy[1].influenceOfAt(accounts[0] is not as expected")
                assert.equal(influence[1][1].toNumber(), 0 * tokenBalance, "delegationProxy[1].influenceOfAt(accounts[1] is not as expected")
                assert.equal(influence[1][2].toNumber(), 2 * tokenBalance, "delegationProxy[1].influenceOfAt(accounts[2] is not as expected")
            })

        });

        describe("simple delegation chain scenario", () => {

            let delegationProxy
            const delegateTo = [ 
                accounts[1],
                accounts[2],
                accounts[5],
                accounts[5],
                accounts[5],
                0x0 ]

            before(async () => {
                delegationProxy = await DelegationProxy.new(0)

                delegationProxy.delegate(delegateTo[0], {from: accounts[0]})
                delegationProxy.delegate(delegateTo[1], {from: accounts[1]})
                delegationProxy.delegate(delegateTo[2], {from: accounts[2]})
                delegationProxy.delegate(delegateTo[3], {from: accounts[3]})
                delegationProxy.delegate(delegateTo[4], {from: accounts[4]})
                delegationProxy.delegate(delegateTo[5], {from: accounts[5]})
            })
    
            it("returns expected delegatedToAt", async () => {
                let delegatedTo = []
                delegatedTo[0] = await delegationProxy.delegatedToAt(accounts[0], web3.eth.blockNumber)
                delegatedTo[1] = await delegationProxy.delegatedToAt(accounts[1], web3.eth.blockNumber)
                delegatedTo[2] = await delegationProxy.delegatedToAt(accounts[2], web3.eth.blockNumber)
                delegatedTo[3] = await delegationProxy.delegatedToAt(accounts[3], web3.eth.blockNumber)
                delegatedTo[4] = await delegationProxy.delegatedToAt(accounts[4], web3.eth.blockNumber)
                delegatedTo[5] = await delegationProxy.delegatedToAt(accounts[5], web3.eth.blockNumber)
                
                assert.equal(delegatedTo[0], delegateTo[0], "delegatedToAt(accounts[0] is not as expected")
                assert.equal(delegatedTo[1], delegateTo[1], "delegatedToAt(accounts[1] is not as expected")
                assert.equal(delegatedTo[2], delegateTo[2], "delegatedToAt(accounts[2] is not as expected")
                assert.equal(delegatedTo[3], delegateTo[3], "delegatedToAt(accounts[3] is not as expected")
                assert.equal(delegatedTo[4], delegateTo[4], "delegatedToAt(accounts[4] is not as expected")
                assert.equal(delegatedTo[5], delegateTo[5], "delegatedToAt(accounts[5] is not as expected")
            })
    
            it("returns expected delegationOfAt", async () => {
                let delegationOf = []
                delegationOf[0] = await delegationProxy.delegationOfAt(accounts[0], web3.eth.blockNumber)
                delegationOf[1] = await delegationProxy.delegationOfAt(accounts[1], web3.eth.blockNumber)
                delegationOf[2] = await delegationProxy.delegationOfAt(accounts[2], web3.eth.blockNumber)
                delegationOf[3] = await delegationProxy.delegationOfAt(accounts[3], web3.eth.blockNumber)
                delegationOf[4] = await delegationProxy.delegationOfAt(accounts[4], web3.eth.blockNumber)
                delegationOf[5] = await delegationProxy.delegationOfAt(accounts[5], web3.eth.blockNumber)
                
                assert.equal(delegationOf[0], accounts[5], "delegationOfAt(accounts[0] is not as expected")
                assert.equal(delegationOf[1], accounts[5], "delegationOfAt(accounts[1] is not as expected")
                assert.equal(delegationOf[2], accounts[5], "delegationOfAt(accounts[2] is not as expected")
                assert.equal(delegationOf[3], accounts[5], "delegationOfAt(accounts[3] is not as expected")
                assert.equal(delegationOf[4], accounts[5], "delegationOfAt(accounts[4] is not as expected")
                assert.equal(delegationOf[5], accounts[5], "delegationOfAt(accounts[5] is not as expected")
                            
            })
                
            it("returns expected delegatedInfluenceFromAt", async () => {
                let delegatedInfluenceFrom = []
                delegatedInfluenceFrom[0] = await delegationProxy.delegatedInfluenceFromAt(accounts[0], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluenceFrom[1] = await delegationProxy.delegatedInfluenceFromAt(accounts[1], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluenceFrom[2] = await delegationProxy.delegatedInfluenceFromAt(accounts[2], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluenceFrom[3] = await delegationProxy.delegatedInfluenceFromAt(accounts[3], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluenceFrom[4] = await delegationProxy.delegatedInfluenceFromAt(accounts[4], miniMeToken.address, web3.eth.blockNumber)
                delegatedInfluenceFrom[5] = await delegationProxy.delegatedInfluenceFromAt(accounts[5], miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(delegatedInfluenceFrom[0].toNumber(), 0 * tokenBalance, "delegatedInfluenceFrom(accounts[0] is not as expected")
                assert.equal(delegatedInfluenceFrom[1].toNumber(), 1 * tokenBalance, "delegatedInfluenceFrom(accounts[1] is not as expected")
                assert.equal(delegatedInfluenceFrom[2].toNumber(), 2 * tokenBalance, "delegatedInfluenceFrom(accounts[2] is not as expected")
                assert.equal(delegatedInfluenceFrom[3].toNumber(), 0 * tokenBalance, "delegatedInfluenceFrom(accounts[3] is not as expected")
                assert.equal(delegatedInfluenceFrom[4].toNumber(), 0 * tokenBalance, "delegatedInfluenceFrom(accounts[4] is not as expected")
                assert.equal(delegatedInfluenceFrom[5].toNumber(), 5 * tokenBalance, "delegatedInfluenceFrom(accounts[5] is not as expected")
            })
            
            it("returns expected influenceOfAt", async () => {
                let influence = []
                influence[0] = await delegationProxy.influenceOfAt(accounts[0], miniMeToken.address, web3.eth.blockNumber)
                influence[1] = await delegationProxy.influenceOfAt(accounts[1], miniMeToken.address, web3.eth.blockNumber)
                influence[2] = await delegationProxy.influenceOfAt(accounts[2], miniMeToken.address, web3.eth.blockNumber)
                influence[3] = await delegationProxy.influenceOfAt(accounts[3], miniMeToken.address, web3.eth.blockNumber)
                influence[4] = await delegationProxy.influenceOfAt(accounts[4], miniMeToken.address, web3.eth.blockNumber)
                influence[5] = await delegationProxy.influenceOfAt(accounts[5], miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(influence[0].toNumber(), 0 * tokenBalance, "influenceOfAt(accounts[0] is not as expected")
                assert.equal(influence[1].toNumber(), 0 * tokenBalance, "influenceOfAt(accounts[1] is not as expected")
                assert.equal(influence[2].toNumber(), 0 * tokenBalance, "influenceOfAt(accounts[2] is not as expected")
                assert.equal(influence[3].toNumber(), 0 * tokenBalance, "influenceOfAt(accounts[3] is not as expected")
                assert.equal(influence[4].toNumber(), 0 * tokenBalance, "influenceOfAt(accounts[4] is not as expected")
                assert.equal(influence[5].toNumber(), 6 * tokenBalance, "influenceOfAt(accounts[5] is not as expected")
            })
        })
    })
})