const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory.sol")
const MiniMeToken = artifacts.require("MiniMeToken.sol")

contract("SimplePoll", accounts => {

    let miniMeTokenFactory, miniMeToken
    const testAccount = accounts[0]

    beforeEach(() => {
        return MiniMeTokenFactory.new()
            .then(_miniMeTokenFactory => {
                miniMeTokenFactory = _miniMeTokenFactory
                return MiniMeToken.new(miniMeTokenFactory.address, 0, 0, "TestToken", 18, "TTN", true)
            })
            .then(_miniMeToken => {
                miniMeToken = _miniMeToken
                return miniMeToken.generateTokens(testAccount, 1000)
            })
    })

    it("MiniMeToken has tokens", () => {
        return miniMeToken.balanceOf(testAccount)
            .then(balance => assert.equal(balance, 1000, "Balance of MiniMeToken is not as expected"))
    })
})