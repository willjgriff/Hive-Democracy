const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory.sol")
const MiniMeToken = artifacts.require("MiniMeToken.sol")
const QuadraticVote = artifacts.require("QuadraticVote.sol")

contract("QuadraticVote", accounts => {

    let miniMeTokenFactory, miniMeToken
    
    const day = 86400;
    const maxMultiplier = 12345678;
    const lagMaxMultiplier = 1234;
    const lagLen = 30 * day;
    const logLen = 30 * day;
    const staLen = 30 * day;
    const decLen = 30 * day;
    const lagEnd        =  lagLen; // blocks vote don't grow
    const logEnd        =  logLen + lagEnd; // blocks while vote grows fast
    const stationaryEnd =  staLen + logEnd; // blocks while top vote is reached
    const decreaseEnd   =  decLen + stationaryEnd; 

    function evmDiv(value1,value2) {
         return Math.floor(value1/value2);
    }

    function voteMultiplierAt(_dt) {
        if(_dt > decreaseEnd) {
            _dt = _dt - decreaseEnd * evmDiv(_dt, decreaseEnd);
        }
        if (_dt < lagEnd) {
            return evmDiv((evmDiv((_dt ** 2 * 100000), lagEnd ** 2) * lagMaxMultiplier), 100000)
        } else if (_dt < logEnd) {
            return (lagMaxMultiplier + evmDiv((evmDiv(((_dt - lagEnd) ** 2 * 100000) , (logEnd - lagEnd) ** 2)) * (maxMultiplier - lagMaxMultiplier) , 100000));
        } else if (_dt < stationaryEnd) {
            return maxMultiplier
        } else {
            return maxMultiplier - evmDiv(evmDiv(maxMultiplier * 100 * (evmDiv(((_dt - stationaryEnd) ** 2 * 100000) , (decreaseEnd - stationaryEnd) ** 2)) , 100000),100)
        }
    }

    describe("voteMultiplierAt(uint _dt)", () => {
        
        beforeEach(async () => {
            miniMeTokenFactory = await MiniMeTokenFactory.new();
            miniMeToken = await MiniMeToken.new(miniMeTokenFactory.address, 0, 0, "TestToken", 18, "TTN", true)
            for (var i = 0; i < 6; i++) {
                miniMeToken.generateTokens(accounts[i], 1)
            
            }
            
        })

        it("Calculates the correct vote in period", async () => {
            const voteToken = await QuadraticVote.new(miniMeToken.address, maxMultiplier, lagMaxMultiplier, lagLen, logLen, staLen, decLen)
            for (var index = 0; index <= decreaseEnd; index += day) {
                ret = await voteToken.voteMultiplierAt(index)
                ret = ret.c[0]
                assert.equal(ret, voteMultiplierAt(index), "["+index/day+"] Wrong multiplier")
            }
        })
    })

})

