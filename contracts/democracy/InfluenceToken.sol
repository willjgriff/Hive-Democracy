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

    uint public startBlock;
    uint public multiplier = 1;
    uint public divisor = 1;
    MiniMeToken source;

    mapping (address => Input[]) inputs;
    
    struct Input {
        uint128 block;
        uint128 available; //could be replaced by turning `value` into int128
    }

    /**
     * @notice requires to be created from controller of token
     *         this is important for the integrity of data in inputs array.
     * @param _source Unchangable MiniMeToken source of balance to build influence from..
     */
    function InfluenceToken(MiniMeToken _source) public {
        require(_source.controller() == msg.sender);
        source = _source;
        startBlock = block.number;
    }

    /**
     * @notice Calculates the multiplier of tokens deposited in a dermined `blockn` block number
     * @param blockn the number of block
     * @return the influence multipler
     */
    function influenceMultiliperAt(uint blockn) public constant returns (uint influence) {
        uint blockDiff = block.number - blockn;
        influence += ((multiplier * blockDiff) / divisor);
    }

    /**
     * @notice calculates the available influence of an address at current block.
     * TODO: implement `balanceOfAt`
     */
    function balanceOf(address _from) public constant returns (uint influence) {
        Input[] memory ins = inputs[_from];
        uint inslen = ins.length;
        if (inslen > 0) {
            for (uint i = 0; i < inslen; i++) {
                Input memory _tx = ins[i];
                uint available = _tx.available;
                if (available > 0) {
                    influence += influenceMultiliperAt(_tx.block) * _tx.available;
                }
            }
        } else { //load from previous balance
            return influenceMultiliperAt(startBlock) * source.balanceOfAt(_from, startBlock);
        }
        
    }


    /**
     * @dev consumes the oldest `_value` amount influence of `who`
     */
    function consumeInfluence(address _who, uint _value) external onlyController {
        Input[] storage ins = inputs[_who];
        uint pos = ins.length;
        uint consumed;
        uint epochMultiplier;
        //consume from previous balance
        if (pos == 0) { 
            epochMultiplier = influenceMultiliperAt(startBlock);
            consumed = epochMultiplier / _value;

            uint startBal = source.balanceOfAt(_who, startBlock);
            uint startInfl = startBal * epochMultiplier;
            require(startInfl > _value);
            uint remaining = startBal - consumed;
            if (remaining > 0) {
                ins.push(Input ({ 
                    block: uint128(block.number),
                    available: uint128(remaining)
                }));
            }
        } else {
            uint required = _value;
            uint available;
            for (uint i = 0; i < pos; i++) {
                epochMultiplier = influenceMultiliperAt(ins[i].block);
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
        block: uint128(block.number),
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
                block: uint128(block.number),
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
                    block: uint128(startBlock),
                    available: uint128(startValue) 
                }));        
            }
        }
        //store the new available balance
        ins.push(Input ({ 
            block: uint128(block.number),
            available: uint128(_value) 
        }));
    }

}