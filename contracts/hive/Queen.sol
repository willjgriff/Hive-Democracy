pragma solidity ^0.4.10;

import "../deploy/DelegatedCall.sol";
import "./Hive.sol";

contract Queen is DelegatedCall {

    event NewConstitution(address constitution);
    Hive public hive;
    address public constitution;
    
    modifier onlyQueen {
        require(msg.sender == address(this));
        _;
    }

    /**
     * @dev initializes Queen with it's first constitution.
     */
    function Queen(address _firstConstitution) {
        hive = Hive(msg.sender);
        constitution = _firstConstitution;
        NewConstitution(constitution);
        require(constitution.delegatecall(sha3("install()")));
    }

    /**
     * @dev sets a new constitution and calls update().
     */
    function updateConstitution(address _newConstitution) onlyQueen {
        constitution = _newConstitution;
        NewConstitution(constitution);
        if (!this.update()) {
            revert();
        }
    }

    /**
     * @dev default function delegates, no ETH payments allowed to queen
     */
    function () delegated {
        // should be empty
    }

    function update() delegated returns (bool) {
        return false;
    }
    /**
     * @dev defines the address for delegation of calls
     */
    function _getDelegatedContract()
        internal
        returns(address)
        {
            return constitution;
        }

    
}