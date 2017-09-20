pragma solidity ^0.4.10;

import "./Constitution.sol";
import "./Queen.sol";
import "../token/MiniMeToken.sol";
import "../token/TokenController.sol";
import "../Controlled.sol";

contract Hive is TokenController {
    
    Queen public queen;
    MiniMeToken public honey;

    modifier onlyQueen { 
        require(msg.sender == address(queen)); 
        _; 
    }


    function Hive(Constitution _firstConstitution, MiniMeToken _honey) {
        require(_honey.controller() == address(this));
        queen = new Queen(_firstConstitution);
        honey = _honey;
    }

    function changeQueen(Queen _newQueen) onlyQueen {
        queen = _newQueen;
    }

    function proxyPayment(address) payable returns(bool) {
        return false;
    }

    function onTransfer(address, address, uint) returns(bool) {
        return true;
    }

    function onApprove(address, address, uint) returns(bool) {
        return true;
    }
}