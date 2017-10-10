pragma solidity ^0.4.11;

import "../token/MiniMeToken.sol";

/**
 * @title DelegationProxy
 * @author Ricardo Guilherme Schmidt (Status Research & Development GmbH)
 * @dev Creates a delegation proxy layer for MiniMeToken. 
 */
contract DelegationProxy {
 
    event Delegate(address who, address to);
    
    //default delegation proxy, being used when user didn't set any delegation at this level.
    DelegationProxy public parentProxy;
    
    //snapshots of all changes in storage, allowing delegation changes being made at any time without compromising results.
    mapping (address => Delegation[]) public delegations;
    
    //storage of indexes of the addresses to `delegations[to].from` 
    mapping (address => uint256) toIndexes;

    struct Delegation {
        uint128 fromBlock; //when this was updated
        address to; //who recieved this delegaton
        address[] from; //list of addresses that delegated to this address
    }
    
    /**
     * @notice Creates a new DelegationProxy with `_parentProxy` as default delegation.
     */
    function DelegationProxy(address _parentProxy) public {
        parentProxy = DelegationProxy(_parentProxy);
    }

    /** 
     * @notice Changes the delegation of `msg.sender` to `_to`. if _to 0x00: delegate to self. 
     *         In case of having a parent proxy, if never defined, fall back to parent proxy. 
     *         If once defined and want to delegate to parent proxy, set `_to` as parent address. 
     * @param _to To what address the caller address will delegate to.
     */
    function delegate(address _to) external {
        _updateDelegate(msg.sender, _to);
    }
    
    /**
     * @notice Reads `_who` configured delegation in this level, 
     *         or from parent level if `_who` never defined/defined to parent address.
     * @param _who What address to lookup.
     * @return The address `_who` choosen delegate to.
     */
    function delegatedTo(address _who) public constant returns (address) {
        return delegatedToAt(_who, block.number);
    }

    /**
     * @notice Reads the final delegate of `_who` at block number `_block`.
     * @param _who Address to lookup.
     * @return Final delegate address.
     */
    function delegationOf(address _who) public constant returns(address) {
        return delegationOfAt(_who, block.number);
    }

    /**
     * @notice Reads the sum of votes a `_who' have at block number `_block`.
     * @param _who From what address.
     * @param _token Address of source MiniMeToken.
     * @return Amount of influence of `who` have.
     */
    function influenceOf(address _who, MiniMeToken _token) public constant returns(uint256 _total) {
        return influenceOfAt(_who, _token, block.number);
    }   

    /**
     * @notice Reads amount delegated influence `_who` received from other addresses.
     * @param _who What address to lookup.
     * @param _token Source MiniMeToken.
     * @return Sum of delegated influence received by `_who` in block `_block` from other addresses.
     */
    function delegatedInfluenceFrom(address _who, address _token) public constant returns(uint256 _total) {
        return delegatedInfluenceFromAt(_who, _token, block.number, address(this));
    }

    /**
     * @notice Reads amount delegated influence `_who` received from other addresses at block number `_block`.
     * @param _who What address to lookup.
     * @param _token Source MiniMeToken.
     * @param _block Position in history to lookup.
     * @return Sum of delegated influence received by `_who` in block `_block` from other addresses
     */
    function delegatedInfluenceFromAt(address _who, address _token, uint _block) public constant returns(uint256 _total) {
        return delegatedInfluenceFromAt(_who, _token, _block, address(this));
    }

    /**
     * @notice Reads `_who` configured delegation at block number `_block` in this level, 
     *         or from parent level if `_who` never defined/defined to parent address.
     * @param _who What address to lookup.
     * @param _block Block number of what height in history.
     * @return The address `_who` choosen delegate to.
     */
    function delegatedToAt(address _who, uint _block) public constant returns (address addr) {
        Delegation[] storage checkpoints = delegations[_who];

        //In case there is no registry
        if (checkpoints.length == 0) {
            if (address(parentProxy) != 0x0) {
                return parentProxy.delegatedToAt(_who, _block);
            } else {
                return 0x0; 
            }
        }
        Delegation memory d = _getMemoryAt(checkpoints, _block);
        // Case user set delegate to parentProxy address
        if (d.to == address(parentProxy) && address(parentProxy) != 0x0) {
           return parentProxy.delegatedToAt(_who, _block); 
        }
        return d.to;
    }

    /**
     * @notice Reads the final delegate of `_who` at block number `_block`.
     * @param _who Address to lookup.
     * @param _block From what block.
     * @return Final delegate address.
     */
    function delegationOfAt(address _who, uint _block) public constant returns(address) {
        address delegate = delegatedToAt(_who, _block);
        if (delegate != 0x0) { //_who is delegating?
            return delegationOfAt(delegate, _block); //load the delegation of _who delegation
        } else {
            return _who; //reached the endpoint of delegation
        }
    }  

    /**
     * @dev Reads amount delegated influence received from other addresses.
     * @param _who What address to lookup.
     * @param _token Source MiniMeToken.
     * @param _block Position in history to lookup.
     * @param _childProxy The child DelegationProxy requesting the call to parent.
     * @return Sum of delegated influence received by `_who` in block `_block` from other addresses.
     */
    function delegatedInfluenceFromAt(
        address _who,
        address _token,
        uint _block,
        address _childProxy
    ) 
        constant 
        returns(uint256 _total)
    {
        Delegation[] storage checkpoints = delegations[_who];
        //In case there is no registry
        if (checkpoints.length == 0) {
            if (address(parentProxy) != 0x0) {
                return parentProxy.delegatedInfluenceFromAt(_who, _token, _block, _childProxy);
            } else {
                return 0; 
            }
        }

        Delegation memory d = _getMemoryAt(checkpoints, _block);
        // Case user set delegate to parentProxy
        if (d.to == address(parentProxy) && address(parentProxy) != 0x0) {
           return parentProxy.delegatedInfluenceFromAt(_who, _token, _block, _childProxy); 
        }
 
        uint _len = d.from.length;
        for (uint256 i = 0; _len > i; i++) {
            address _from = d.from[i];
            _total += MiniMeToken(_token).balanceOfAt(_from, _block); // source of _who votes
            _total += DelegationProxy(_childProxy).delegatedInfluenceFromAt(_from, _token, _block, _childProxy); //sum the from delegation votes
        }
            
    }

    /**
     * @notice Reads the sum of votes a `_who' have at block number `_block`.
     * @param _who From what address.
     * @param _token Address of source MiniMeToken.
     * @param _block From what block
     * @return Amount of influence of `who` have.
     */
    function influenceOfAt(address _who, MiniMeToken _token, uint _block) public constant returns(uint256 _total) {
        if (delegationOfAt(_who, _block) == _who) { //is endpoint of delegation?
            _total = MiniMeToken(_token).balanceOfAt(_who, _block); // source of _who votes
            _total += delegatedInfluenceFromAt(_who, _token, _block, address(this)); //calcule the votes delegated to _who
        } else { 
           _total = 0; //no influence because were delegated
        }
    }   
    
    /** 
     * @dev Changes the delegation of `_from` to `_to`. if _to 0x00: delegate to self. 
     *         In case of having a parent proxy, if never defined, fall back to parent proxy. 
     *         If once defined and want to delegate to parent proxy, set `_to` as parent address. 
     * @param _from Address delegating.
     * @param _to Address delegated.
     */
    function _updateDelegate(address _from, address _to) internal {
        require(delegationOfAt(_to, block.number) != msg.sender); //block impossible circular delegation
        Delegate(_from, _to);
        Delegation memory _newFrom; //allocate memory
        Delegation[] storage fromHistory = delegations[_from];
        if (fromHistory.length > 0) { //have old config?
            _newFrom = fromHistory[fromHistory.length - 1]; //load to memory
            _newFrom.from = fromHistory[fromHistory.length - 1].from;
            if (toIndexes[_from] > 0) { //was delegating? remove old link
                _removeDelegated(_newFrom.to, toIndexes[_from]);
            }
        }
        //Add the new delegation
        _newFrom.fromBlock = uint128(block.number);
        _newFrom.to = _to; //delegate address

        if (_to != 0x0 && _to != address(parentProxy)) { //_to is an address?
            _addDelegated(_from, _to);
        } else {
            toIndexes[_from] = 0; //zero index
        }
        fromHistory.push(_newFrom); //register `from` delegation update;
    }

    /**
      * @dev `_getDelegationAt` retrieves the delegation at a given block number.
      * @param checkpoints The memory being queried.
      * @param _block The block number to retrieve the value at.
      * @return The delegation being queried.
      */
    function _getMemoryAt(Delegation[] storage checkpoints, uint _block) constant internal returns (Delegation d) {
        // Case last checkpoint is the one;
        if (_block >= checkpoints[checkpoints.length-1].fromBlock) {
            d = checkpoints[checkpoints.length-1];
        } else {    
            // Lookup in array;
            uint min = 0;
            uint max = checkpoints.length-1;
            while (max > min) {
                uint mid = (max + min + 1) / 2;
                if (checkpoints[mid].fromBlock<=_block) {
                    min = mid;
                } else {
                    max = mid-1;
                }
            }
            d = checkpoints[min];
        }
    }

    /**
     * @dev Removes delegation at `_toIndex` from `_to` address.
     * @param _to Delegate address to remove delegation.
     * @param _toIndex Index of delegation being removed.
     */
    function _removeDelegated(address _to, uint _toIndex) private {
        Delegation[] storage oldTo = delegations[_to]; //load delegation storage
        uint _oldToLen = oldTo.length;
        assert(_oldToLen > 0); //if code tried to remove from nothing this is absolutely bad
        Delegation memory _newOldTo = oldTo[_oldToLen - 1];//copy to memory last result
        address replacer = _newOldTo.from[_newOldTo.from.length - 1];
        _newOldTo.from[_toIndex - 1] = replacer; //replace delegated address at `_toIndex`
        oldTo.push(_newOldTo); //save the value at memory
        oldTo[_oldToLen].from.length--; //remove duplicated `to`
        toIndexes[replacer] = _toIndex;
    }

    /**
     * @dev Add delegation of `_from` in delegate `_to`.
     * @param _from Delegator address delegating their influence.
     * @param _to Delegate address receiving the influence;
     * @return _toIndex The index of `_from` in `_to` delegate.
     */
    function _addDelegated(address _from, address _to) private {
        Delegation memory _newTo; // allocates space in memory
        Delegation[] storage toHistory = delegations[_to]; //load delegation storage
        uint toHistLen = toHistory.length; 
        if (toHistLen > 0) { //have data, should copy 'from' array.
            _newTo = toHistory[toHistLen - 1]; //copy to memory last one
        } else { 
            _newTo.to = address(parentProxy); // configure delegate of `_to` because it was never defined
        }
        _newTo.fromBlock = uint128(block.number); //define the new block number
        toHistory.push(_newTo); //register `to` delegated from
        toHistory[toHistLen].from.push(_from); //add the delegated from in to list
        toIndexes[_from] = toHistory[toHistLen].from.length; //link to index
    }

}