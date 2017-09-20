pragma solidity ^0.4.12;

import "../Controlled.sol";

/**
 * @title LibraryReg
 * @author Ricardo Guilherme Schmidt (Status Research & Development GmbH)
 * Stores library address for stub contracts. 
 */
contract LibraryReg is Controlled {

    event LibraryUpdated(address lib);
    
    mapping (uint => address) public libraries;    
    address latest;

    mapping (address => address) public addressReg;


    function LibraryReg(address _lib) {
        setLibrary(_lib);
    }


    function update() {
        require(latest != 0x0);
        addressReg[msg.sender] = latest;
    }


    function updateTo(uint blknum) {
        address lib = libraries[blknum];
        require(lib != 0x0);
        addressReg[msg.sender] = lib;
    }


    function setLibrary(address _lib) onlyController {
        latest = _lib;
        libraries[block.number] = _lib;
        LibraryUpdated(_lib);
    }

}
