pragma solidity ^0.4.15;

import "../token/MiniMeToken.sol";
import "../Controlled.sol";

/**
 * @title InfluenceToken
 * @author Ricardo Guilherme Schmidt (Status Research & Development GmbH)
 * Creates volatile influence based on a MiniMeToken balances not moved in accounts
 * This Token is used for Quadratic Voting of issues.
 */
contract InfluenceToken is Controlled {
 
    MiniMeToken public source;
    uint public maxMultiplier; //max multiplier for tokens balance
    uint public lagMaxMultiplier; //max multiplier for tokens balance in lag phase
    uint public lagEnd; // end of period of slow influence grow
    uint public logEnd; // end of period of fast influence grow
    uint public stationaryEnd; // end of period of fixed maxMultiplier
    uint public decreaseEnd; // end of period of decrese of multiplier
    
    uint public startTime;
    uint public startBlock;

    mapping (address => Input[]) inputs;
    
    struct Input {
        uint256 time;
        uint128 available; 
    }

    /**
     * @notice requires to be created from controller of token
     *         this is important for the integrity of data in inputs array.
     * @param _source Unchangable MiniMeToken source of balance to build influence from.
     * @param _maxMultiplier Max multiplier for token balance
     * @param _lagMaxMultipler Max multiplier in lagPeriod
     * @param _lagLenght Lag phase time lenght
     * @param _logLenght Log phase time lenght
     * @param _stationaryLenght Stationary phase time lenght
     * @param _decreaseLenght Decrease phase time lenght
     */
    function InfluenceToken(
        MiniMeToken _source,
        uint _maxMultiplier,
        uint _lagMaxMultipler,
        uint _lagLenght,
        uint _logLenght,
        uint _stationaryLenght,
        uint _decreaseLenght
    ) 
        public 
    {
        require(_maxMultiplier >= _lagMaxMultipler);
        require(_source.controller() == msg.sender);
        source = _source;
        maxMultiplier = _maxMultiplier;
        lagMaxMultiplier = _lagMaxMultipler;
        startTime = block.timestamp;
        startBlock = block.number;
        lagEnd = _lagLenght;
        logEnd = _lagLenght + _logLenght;
        stationaryEnd = _lagLenght + _logLenght + _stationaryLenght;
        decreaseEnd = _lagLenght + _logLenght + _stationaryLenght + _decreaseLenght;
    }
                           
    /**
     * @notice Calculates the multiplier of tokens deposited in a dermined `_dt` difference of time
     * @param _dt the number of block
     * @return the influence multipler
     */
    function influenceMultiliperAt(uint _dt) public constant returns (uint influence) {
        if (_dt > decreaseEnd) {
            _dt = _dt - decreaseEnd * ((_dt) / decreaseEnd);
        }
        if (_dt < lagEnd) {
            return lagMultiplier(_dt);
        } else if (_dt < logEnd) {
            return logMultiplier(_dt);
        } else if (_dt < stationaryEnd) {
            return maxMultiplier;
        } else {
            return decreaseMultiplier(_dt);
        }
        
    }
    
    function lagMultiplier(uint _dt) private constant returns (uint) { 
       return ((_dt ** 2 * 100000) / lagEnd ** 2) * (lagMaxMultiplier) / 100000;
    }
    
    function logMultiplier(uint _dt) private constant returns (uint) { 
        return (lagMaxMultiplier + (((_dt - lagEnd) ** 2 * 100000) / (logEnd - lagEnd) ** 2) * (maxMultiplier - lagMaxMultiplier) / 100000);
    }

    function decreaseMultiplier(uint _dt) private returns (uint) {
        return maxMultiplier - (maxMultiplier * ((((_dt - stationaryEnd) ** 2 * 100000) / (decreaseEnd - stationaryEnd) ** 2) / 100000));
    }

    /**
     * @notice calculates the available influence of an address at current block.
     */
    function availableInfluenceOf(address _from) public constant returns (uint influence) {
        Input[] memory ins = inputs[_from];
        uint inslen = ins.length;
        if (inslen > 0) {
            for (uint i = 0; i < inslen; i++) {
                Input memory _tx = ins[i];
                uint available = _tx.available;
                if (available > 0) {
                    influence += influenceMultiliperAt(_tx.time) * _tx.available;
                }
            }
        } else { //load from previous balance
            return influenceMultiliperAt(startTime) * source.balanceOfAt(_from, startBlock);
        }
        
    }
    

    /**
     * @dev consumes the oldest tokens that genereate the `_value` amount influence of `who`
     */
    function consumeInfluence(address _who, uint _value) public onlyController {
        Input[] storage ins = inputs[_who];
        uint pos = ins.length;
        uint consumed;
        uint epochMultiplier;
        //consume from previous balance
        if (pos == 0) { 
            epochMultiplier = influenceMultiliperAt(startTime);
            consumed = epochMultiplier / _value;

            uint startBal = source.balanceOfAt(_who, startBlock);
            uint startInfl = startBal * epochMultiplier;
            require(startInfl > _value);
            uint remaining = startBal - consumed;
            if (remaining > 0) {
                ins.push(Input ({ 
                    time: startTime,
                    available: uint128(remaining)
                }));
            }
        } else {
            uint required = _value;
            uint available;
            for (uint i = 0; i < pos; i++) {
                epochMultiplier = influenceMultiliperAt(ins[i].time);
                available = ins[i].available;
                if (available > 0) {
                    available = epochMultiplier * available;
                    if (required > available) {
                        consumed += ins[i].available;
                        ins[i].available = 0;
                        required -= available;
                    } else {
                        uint cons = epochMultiplier / required;
                        consumed += cons;
                        ins[i].available = uint128(available - cons);
                        required = 0;
                        break;
                    }
                }
            }
        }


    //resets the consumed tokens to current block to generate new influence
    ins.push(Input ({ 
        time: block.timestamp,
        available: uint128(consumed) 
    }));

    }
    
    /**
     * @dev should be called configured token _source TokenController 
     **/
    function moved(address _from, address _to, uint _value) external onlyController {
        sent(_from, _value);
        received(_to,_value);
    }

    /**
     * @dev consumes the newest amount of `_value` and all their multiplied influece.
     **/
    function sent(address _who, uint _value) private {
        Input[] storage ins = inputs[_who];
        uint pos = ins.length;
        //clear tokens from previous balance
        if (pos == 0) { 
            ins.push(Input ({ 
                time: startTime,
                available: uint128(source.balanceOfAt(_who, startBlock) - _value) 
            }));
        } else {
            uint128 required = uint128(_value);
            uint128 available;
            while (pos > 0) {
                pos--;
                available = ins[pos].available;
                if (available > 0) {
                    if (required > available) {
                        ins[pos].available = 0;
                        required -= available;
                    } else {
                        ins[pos].available = available - required;
                        required = 0;
                        break;
                    }
                }
            }
        }
    }

    /**
     * @dev registers available influence source at current block
     **/
    function received(address _who, uint _value) private {
        Input[] storage ins = inputs[_who];

        //install previous balance
        if (ins.length == 0) {
            uint startValue = source.balanceOfAt(_who, startBlock);
            if (startValue > 0) {
                ins.push(Input ({ 
                    time: startTime,
                    available: uint128(startValue) 
                }));        
            }
        }
        //store the new available balance
        ins.push(Input ({ 
            time: block.timestamp,
            available: uint128(_value) 
        }));
    }

}