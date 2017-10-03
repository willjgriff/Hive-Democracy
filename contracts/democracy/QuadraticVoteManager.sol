pragma solidity ^0.4.15;

import "../token/MiniMeToken.sol";
import "../token/TokenController.sol";
import "./QuadraticVote.sol";

contract QuadraticVoteManager is TokenController {
    QuadraticVote public quadraticVote;
    MiniMeToken public token;
    function QuadraticVoteManager(MiniMeToken _source) {
        token = _source;
    }

    function init(
        uint _maxMultiplier,
        uint _lagMaxMultipler,
        uint _lagLenght,
        uint _logLenght,
        uint _stationaryLenght,
        uint _decreaseLenght
    )
        public
    {
        require(address(quadraticVote) == 0x0);
        require(token.controller() == address(this));
        quadraticVote = new QuadraticVote(token, _maxMultiplier, _lagMaxMultipler, _lagLenght, _logLenght, _stationaryLenght, _decreaseLenght);
    }


    function proxyPayment(address) payable returns(bool) {
        return false;
    }

    function onTransfer(address _from, address _to, uint _value) returns(bool) {
        quadraticVote.moved(_from, _to, _value);
        return true;
    }

    function onApprove(address, address, uint) returns(bool) {
        return true;
    }
}
