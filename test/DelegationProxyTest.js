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
        const member1 = accounts[0]
        const member2 = accounts[1]
        const member3 = accounts[2]
        const member4 = accounts[3]
        const member5 = accounts[4]
        const member6 = accounts[5]
        const tokenBalance = 1000
        before(async () => {   
            miniMeToken = await MiniMeToken.new(miniMeTokenFactory.address, 0, 0, "TestToken", 18, "TTN", true)
            miniMeToken.generateTokens(member1, tokenBalance)
            miniMeToken.generateTokens(member2, tokenBalance)
            miniMeToken.generateTokens(member3, tokenBalance)
            miniMeToken.generateTokens(member4, tokenBalance)
            miniMeToken.generateTokens(member5, tokenBalance)
            await miniMeToken.generateTokens(member6, tokenBalance)

        });


        describe("delegation multilevel scenario", () => {
            let Lv1delegationProxy
            let Lv2delegationProxy
            const Lv1delegateTo1 = member2
            const Lv1delegateTo2 = member3
            const Lv1delegateTo3 = 0x0

            const Lv2delegateTo1 = 0x0
            const Lv2delegateTo2 = member3
            const Lv2delegateTo3 = 0x0
        
            before(async () => {
                Lv1delegationProxy = await DelegationProxy.new(0)
                Lv1delegationProxy.delegate(Lv1delegateTo1, {from: member1})
                Lv1delegationProxy.delegate(Lv1delegateTo2, {from: member2})
                Lv1delegationProxy.delegate(Lv1delegateTo3, {from: member3})

                Lv2delegationProxy = await DelegationProxy.new(Lv1delegationProxy.address)
                Lv2delegationProxy.delegate(Lv2delegateTo1, {from: member1})
                Lv2delegationProxy.delegate(Lv2delegateTo2, {from: member2})
                Lv2delegationProxy.delegate(Lv2delegateTo3, {from: member3})
     
            })

            it("returns expected delegatedToAt", async () => {
                const Lv1delegatedTo1 = await Lv1delegationProxy.delegatedToAt(member1, web3.eth.blockNumber)
                const Lv1delegatedTo2 = await Lv1delegationProxy.delegatedToAt(member2, web3.eth.blockNumber)
                const Lv1delegatedTo3 = await Lv1delegationProxy.delegatedToAt(member3, web3.eth.blockNumber)
                const Lv2delegatedTo1 = await Lv2delegationProxy.delegatedToAt(member1, web3.eth.blockNumber)
                const Lv2delegatedTo2 = await Lv2delegationProxy.delegatedToAt(member2, web3.eth.blockNumber)
                const Lv2delegatedTo3 = await Lv2delegationProxy.delegatedToAt(member3, web3.eth.blockNumber)
                
                assert.equal(Lv1delegatedTo1, Lv1delegateTo1, "Lv1.delegatedToAt(member1 is not as expected")
                assert.equal(Lv1delegatedTo2, Lv1delegateTo2, "Lv1.delegatedToAt(member2 is not as expected")
                assert.equal(Lv1delegatedTo3, Lv1delegateTo3, "Lv1.delegatedToAt(member3 is not as expected")
                assert.equal(Lv2delegatedTo1, Lv2delegateTo1, "Lv2.delegatedToAt(member1 is not as expected")
                assert.equal(Lv2delegatedTo2, Lv2delegateTo2, "Lv2.delegatedToAt(member2 is not as expected")
                assert.equal(Lv2delegatedTo3, Lv2delegateTo3, "Lv2.delegatedToAt(member3 is not as expected")
            })
            
            it("returns expected delegationOfAt", async () => {
                const Lv1delegationOf1 = await Lv1delegationProxy.delegationOfAt(member1, web3.eth.blockNumber)
                const Lv1delegationOf2 = await Lv1delegationProxy.delegationOfAt(member2, web3.eth.blockNumber)
                const Lv1delegationOf3 = await Lv1delegationProxy.delegationOfAt(member3, web3.eth.blockNumber)
                const Lv2delegationOf1 = await Lv2delegationProxy.delegationOfAt(member1, web3.eth.blockNumber)
                const Lv2delegationOf2 = await Lv2delegationProxy.delegationOfAt(member2, web3.eth.blockNumber)
                const Lv2delegationOf3 = await Lv2delegationProxy.delegationOfAt(member3, web3.eth.blockNumber)
                
                assert.equal(Lv1delegationOf1, member3, "Lv1.delegationOfAt(member1 is not as expected")
                assert.equal(Lv1delegationOf2, member3, "Lv1.delegationOfAt(member2 is not as expected")
                assert.equal(Lv1delegationOf3, member3, "Lv1.delegationOfAt(member3 is not as expected")
                assert.equal(Lv2delegationOf1, member1, "Lv2.delegationOfAt(member1 is not as expected")
                assert.equal(Lv2delegationOf2, member3, "Lv2.delegationOfAt(member2 is not as expected")
                assert.equal(Lv2delegationOf3, member3, "Lv2.delegationOfAt(member3 is not as expected")
                            
            })

            it("returns expected delegatedInfluenceFromAt", async () => {
                
                const Lv1delegatedInfluence1 = await Lv1delegationProxy.delegatedInfluenceFromAt(member1, miniMeToken.address, web3.eth.blockNumber)
                const Lv1delegatedInfluence2 = await Lv1delegationProxy.delegatedInfluenceFromAt(member2, miniMeToken.address, web3.eth.blockNumber)
                const Lv1delegatedInfluence3 = await Lv1delegationProxy.delegatedInfluenceFromAt(member3, miniMeToken.address, web3.eth.blockNumber)
                const Lv2delegatedInfluence1 = await Lv2delegationProxy.delegatedInfluenceFromAt(member1, miniMeToken.address, web3.eth.blockNumber)
                const Lv2delegatedInfluence2 = await Lv2delegationProxy.delegatedInfluenceFromAt(member2, miniMeToken.address, web3.eth.blockNumber)
                const Lv2delegatedInfluence3 = await Lv2delegationProxy.delegatedInfluenceFromAt(member3, miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(Lv1delegatedInfluence1.toNumber(), 0 * tokenBalance, "Lv1.delegatedInfluenceFrom(member1 is not as expected")
                assert.equal(Lv1delegatedInfluence2.toNumber(), 1 * tokenBalance, "Lv1.delegatedInfluenceFrom(member2 is not as expected")
                assert.equal(Lv1delegatedInfluence3.toNumber(), 2 * tokenBalance, "Lv1.delegatedInfluenceFrom(member3 is not as expected")
                assert.equal(Lv2delegatedInfluence1.toNumber(), 0 * tokenBalance, "Lv2.delegatedInfluenceFrom(member1 is not as expected")
                assert.equal(Lv2delegatedInfluence2.toNumber(), 0 * tokenBalance, "Lv2.delegatedInfluenceFrom(member2 is not as expected")
                assert.equal(Lv2delegatedInfluence3.toNumber(), 1 * tokenBalance, "Lv2.delegatedInfluenceFrom(member3 is not as expected")
            })
            
            it("returns expected influenceOfAt", async () => {
    
                const Lv1influence1 = await Lv1delegationProxy.influenceOfAt(member1, miniMeToken.address, web3.eth.blockNumber)
                const Lv1influence2 = await Lv1delegationProxy.influenceOfAt(member2, miniMeToken.address, web3.eth.blockNumber)
                const Lv1influence3 = await Lv1delegationProxy.influenceOfAt(member3, miniMeToken.address, web3.eth.blockNumber)
                const Lv2influence1 = await Lv2delegationProxy.influenceOfAt(member1, miniMeToken.address, web3.eth.blockNumber)
                const Lv2influence2 = await Lv2delegationProxy.influenceOfAt(member2, miniMeToken.address, web3.eth.blockNumber)
                const Lv2influence3 = await Lv2delegationProxy.influenceOfAt(member3, miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(Lv1influence1.toNumber(), 0 * tokenBalance, "Lv1.influenceOfAt(member1 is not as expected")
                assert.equal(Lv1influence2.toNumber(), 0 * tokenBalance, "Lv1.influenceOfAt(member2 is not as expected")
                assert.equal(Lv1influence3.toNumber(), 3 * tokenBalance, "Lv1.influenceOfAt(member3 is not as expected")
                assert.equal(Lv2influence1.toNumber(), 1 * tokenBalance, "Lv2.influenceOfAt(member1 is not as expected")
                assert.equal(Lv2influence2.toNumber(), 0 * tokenBalance, "Lv2.influenceOfAt(member2 is not as expected")
                assert.equal(Lv2influence3.toNumber(), 2 * tokenBalance, "Lv2.influenceOfAt(member3 is not as expected")
            })

        });

        describe("simple delegation chain scenario", () => {
            let delegationProxy
        
            
            const delegateTo1 = member2
            const delegateTo2 = member3
            const delegateTo3 = member6
            const delegateTo4 = member6
            const delegateTo5 = member6
            const delegateTo6 = 0x0

            before(async () => {
                delegationProxy = await DelegationProxy.new(0)

                delegationProxy.delegate(delegateTo1, {from: member1})
                delegationProxy.delegate(delegateTo2, {from: member2})
                delegationProxy.delegate(delegateTo3, {from: member3})
                delegationProxy.delegate(delegateTo4, {from: member4})
                delegationProxy.delegate(delegateTo5, {from: member5})
                await delegationProxy.delegate(delegateTo6, {from: member6})
            })
    
            it("returns expected delegatedToAt", async () => {
                const delegatedTo = await delegationProxy.delegatedToAt(member1, web3.eth.blockNumber)
                const delegatedTo2 = await delegationProxy.delegatedToAt(member2, web3.eth.blockNumber)
                const delegatedTo3 = await delegationProxy.delegatedToAt(member3, web3.eth.blockNumber)
                const delegatedTo4 = await delegationProxy.delegatedToAt(member4, web3.eth.blockNumber)
                const delegatedTo5 = await delegationProxy.delegatedToAt(member5, web3.eth.blockNumber)
                const delegatedTo6 = await delegationProxy.delegatedToAt(member6, web3.eth.blockNumber)
                
                assert.equal(delegatedTo, delegateTo1, "delegatedToAt(member1 is not as expected")
                assert.equal(delegatedTo2, delegateTo2, "delegatedToAt(member2 is not as expected")
                assert.equal(delegatedTo3, delegateTo3, "delegatedToAt(member3 is not as expected")
                assert.equal(delegatedTo4, delegateTo4, "delegatedToAt(member4 is not as expected")
                assert.equal(delegatedTo5, delegateTo5, "delegatedToAt(member5 is not as expected")
                assert.equal(delegatedTo6, delegateTo6, "delegatedToAt(member6 is not as expected")
            })
    
            it("returns expected delegationOfAt", async () => {
                const delegationOf1 = await delegationProxy.delegationOfAt(member1, web3.eth.blockNumber)
                const delegationOf2 = await delegationProxy.delegationOfAt(member2, web3.eth.blockNumber)
                const delegationOf3 = await delegationProxy.delegationOfAt(member3, web3.eth.blockNumber)
                const delegationOf4 = await delegationProxy.delegationOfAt(member4, web3.eth.blockNumber)
                const delegationOf5 = await delegationProxy.delegationOfAt(member5, web3.eth.blockNumber)
                const delegationOf6 = await delegationProxy.delegationOfAt(member6, web3.eth.blockNumber)
                
                assert.equal(delegationOf1, member6, "delegationOfAt(member1 is not as expected")
                assert.equal(delegationOf2, member6, "delegationOfAt(member2 is not as expected")
                assert.equal(delegationOf3, member6, "delegationOfAt(member3 is not as expected")
                assert.equal(delegationOf4, member6, "delegationOfAt(member4 is not as expected")
                assert.equal(delegationOf5, member6, "delegationOfAt(member5 is not as expected")
                assert.equal(delegationOf6, member6, "delegationOfAt(member6 is not as expected")
                            
            })
                
            it("returns expected delegatedInfluenceFromAt", async () => {
                
                const delegatedInfluence1 = await delegationProxy.delegatedInfluenceFromAt(member1, miniMeToken.address, web3.eth.blockNumber)
                const delegatedInfluence2 = await delegationProxy.delegatedInfluenceFromAt(member2, miniMeToken.address, web3.eth.blockNumber)
                const delegatedInfluence3 = await delegationProxy.delegatedInfluenceFromAt(member3, miniMeToken.address, web3.eth.blockNumber)
                const delegatedInfluence4 = await delegationProxy.delegatedInfluenceFromAt(member4, miniMeToken.address, web3.eth.blockNumber)
                const delegatedInfluence5 = await delegationProxy.delegatedInfluenceFromAt(member5, miniMeToken.address, web3.eth.blockNumber)
                const delegatedInfluence6 = await delegationProxy.delegatedInfluenceFromAt(member6, miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(delegatedInfluence1.toNumber(), 0 * tokenBalance, "delegatedInfluenceFrom(member1 is not as expected")
                assert.equal(delegatedInfluence2.toNumber(), 1 * tokenBalance, "delegatedInfluenceFrom(member2 is not as expected")
                assert.equal(delegatedInfluence3.toNumber(), 2 * tokenBalance, "delegatedInfluenceFrom(member3 is not as expected")
                assert.equal(delegatedInfluence4.toNumber(), 0 * tokenBalance, "delegatedInfluenceFrom(member4 is not as expected")
                assert.equal(delegatedInfluence5.toNumber(), 0 * tokenBalance, "delegatedInfluenceFrom(member5 is not as expected")
                assert.equal(delegatedInfluence6.toNumber(), 5 * tokenBalance, "delegatedInfluenceFrom(member6 is not as expected")
            })
            
            it("returns expected influenceOfAt", async () => {
    
                const influence1 = await delegationProxy.influenceOfAt(member1, miniMeToken.address, web3.eth.blockNumber)
                const influence2 = await delegationProxy.influenceOfAt(member2, miniMeToken.address, web3.eth.blockNumber)
                const influence3 = await delegationProxy.influenceOfAt(member3, miniMeToken.address, web3.eth.blockNumber)
                const influence4 = await delegationProxy.influenceOfAt(member4, miniMeToken.address, web3.eth.blockNumber)
                const influence5 = await delegationProxy.influenceOfAt(member5, miniMeToken.address, web3.eth.blockNumber)
                const influence6 = await delegationProxy.influenceOfAt(member6, miniMeToken.address, web3.eth.blockNumber)
                
                assert.equal(influence1.toNumber(), 0 * tokenBalance, "influenceOfAt(member1 is not as expected")
                assert.equal(influence2.toNumber(), 0 * tokenBalance, "influenceOfAt(member2 is not as expected")
                assert.equal(influence3.toNumber(), 0 * tokenBalance, "influenceOfAt(member3 is not as expected")
                assert.equal(influence4.toNumber(), 0 * tokenBalance, "influenceOfAt(member4 is not as expected")
                assert.equal(influence5.toNumber(), 0 * tokenBalance, "influenceOfAt(member5 is not as expected")
                assert.equal(influence6.toNumber(), 6 * tokenBalance, "influenceOfAt(member6 is not as expected")
            })
        })
    })
})