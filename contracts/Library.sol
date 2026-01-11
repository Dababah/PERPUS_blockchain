// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Library
 * @dev Smart Contract untuk Sistem Perpustakaan Berbasis Blockchain
 * @notice Contract ini menyimpan data buku, anggota, dan riwayat peminjaman di Ethereum Sepolia
 * 
 * ARSITEKTUR:
 * - Blockchain: Menyimpan transaksi dan CID IPFS
 * - IPFS (Pinata): Menyimpan metadata buku (JSON)
 * - Frontend: Web3.js untuk interaksi dengan contract
 */
contract Library {
    
    // ========== STATE VARIABLES ==========
    
    address public admin; // Alamat admin perpustakaan
    uint public bookCount; // Total jumlah buku yang pernah ditambahkan
    uint public memberCount; // Total jumlah anggota terdaftar
    uint public borrowCount; // Total jumlah peminjaman yang pernah terjadi
    
    // ========== STRUCTS ==========
    
    /**
     * @dev Struct untuk menyimpan informasi buku
     * @notice Hanya menyimpan CID IPFS, bukan metadata lengkap
     */
    struct Book {
        uint id; // ID unik buku
        string ipfsHash; // CID dari Pinata (metadata JSON)
        uint stock; // Jumlah stok tersedia
        uint totalCopies; // Total salinan buku
        bool exists; // Flag untuk cek apakah buku ada
        uint addedAt; // Timestamp saat buku ditambahkan
    }
    
    /**
     * @dev Struct untuk menyimpan informasi anggota
     */
    struct Member {
        address memberAddress; // Alamat wallet anggota
        string name; // Nama anggota
        bool isRegistered; // Status registrasi
        uint registeredAt; // Timestamp registrasi
        uint totalBorrowed; // Total buku yang pernah dipinjam
    }
    
    /**
     * @dev Struct untuk menyimpan riwayat peminjaman
     */
    struct BorrowHistory {
        uint borrowId; // ID unik peminjaman
        address borrower; // Alamat peminjam
        uint bookId; // ID buku yang dipinjam
        uint borrowTime; // Waktu peminjaman
        uint returnTime; // Waktu pengembalian (0 jika belum dikembalikan)
        bool returned; // Status pengembalian
    }
    
    // ========== MAPPINGS ==========
    
    mapping(uint => Book) public books; // ID buku => Data buku
    mapping(address => Member) public members; // Alamat => Data anggota
    mapping(uint => BorrowHistory) public borrowHistory; // ID peminjaman => Riwayat
    mapping(address => uint) public currentBorrow; // Alamat => ID buku yang sedang dipinjam (0 jika tidak ada)
    
    // ========== EVENTS ==========
    
    event BookAdded(uint indexed bookId, string ipfsHash, uint stock, uint timestamp);
    event MemberRegistered(address indexed memberAddress, string name, uint timestamp);
    event BookBorrowed(uint indexed borrowId, address indexed borrower, uint indexed bookId, uint timestamp);
    event BookReturned(uint indexed borrowId, address indexed borrower, uint indexed bookId, uint timestamp);
    event StockUpdated(uint indexed bookId, uint newStock);
    
    // ========== MODIFIERS ==========
    
    /**
     * @dev Modifier untuk membatasi akses hanya untuk admin
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "Hanya admin yang bisa melakukan aksi ini");
        _;
    }
    
    /**
     * @dev Modifier untuk memastikan pengguna adalah anggota terdaftar
     */
    modifier onlyMember() {
        require(members[msg.sender].isRegistered, "Anda harus terdaftar sebagai anggota");
        _;
    }
    
    /**
     * @dev Modifier untuk memastikan buku ada
     */
    modifier bookExists(uint _bookId) {
        require(books[_bookId].exists, "Buku tidak ditemukan");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    /**
     * @dev Constructor - Set deployer sebagai admin
     */
    constructor() {
        admin = msg.sender;
        bookCount = 0;
        memberCount = 0;
        borrowCount = 0;
    }
    
    // ========== BOOK MANAGEMENT FUNCTIONS ==========
    
    /**
     * @dev Menambahkan buku baru ke perpustakaan
     * @param _ipfsHash CID dari Pinata (metadata JSON buku)
     * @param _stock Jumlah stok buku yang tersedia
     * @notice Hanya admin yang bisa menambahkan buku
     */
    function addBook(string memory _ipfsHash, uint _stock) public onlyAdmin {
        require(bytes(_ipfsHash).length > 0, "IPFS hash tidak boleh kosong");
        require(_stock > 0, "Stok harus lebih dari 0");
        
        bookCount++;
        
        books[bookCount] = Book({
            id: bookCount,
            ipfsHash: _ipfsHash,
            stock: _stock,
            totalCopies: _stock,
            exists: true,
            addedAt: block.timestamp
        });
        
        emit BookAdded(bookCount, _ipfsHash, _stock, block.timestamp);
    }
    
    /**
     * @dev Update stok buku
     * @param _bookId ID buku yang akan diupdate
     * @param _newStock Stok baru
     */
    function updateBookStock(uint _bookId, uint _newStock) public onlyAdmin bookExists(_bookId) {
        require(_newStock >= 0, "Stok tidak boleh negatif");
        
        books[_bookId].stock = _newStock;
        books[_bookId].totalCopies = _newStock;
        
        emit StockUpdated(_bookId, _newStock);
    }
    
    /**
     * @dev Mendapatkan informasi buku
     * @param _bookId ID buku
     * @return Book struct
     */
    function getBook(uint _bookId) public view bookExists(_bookId) returns (Book memory) {
        return books[_bookId];
    }
    
    /**
     * @dev Mendapatkan semua ID buku yang tersedia
     * @return Array of book IDs
     */
    function getAllBookIds() public view returns (uint[] memory) {
        uint[] memory bookIds = new uint[](bookCount);
        for (uint i = 1; i <= bookCount; i++) {
            bookIds[i - 1] = i;
        }
        return bookIds;
    }
    
    // ========== MEMBER MANAGEMENT FUNCTIONS ==========
    
    /**
     * @dev Registrasi anggota baru
     * @param _name Nama anggota
     * @notice Setiap wallet hanya bisa registrasi sekali
     */
    function registerMember(string memory _name) public {
        require(!members[msg.sender].isRegistered, "Anda sudah terdaftar sebagai anggota");
        require(bytes(_name).length > 0, "Nama tidak boleh kosong");
        
        memberCount++;
        
        members[msg.sender] = Member({
            memberAddress: msg.sender,
            name: _name,
            isRegistered: true,
            registeredAt: block.timestamp,
            totalBorrowed: 0
        });
        
        emit MemberRegistered(msg.sender, _name, block.timestamp);
    }
    
    /**
     * @dev Mendapatkan informasi anggota
     * @param _memberAddress Alamat wallet anggota
     * @return Member struct
     */
    function getMember(address _memberAddress) public view returns (Member memory) {
        return members[_memberAddress];
    }
    
    /**
     * @dev Cek apakah address adalah anggota terdaftar
     * @param _memberAddress Alamat wallet yang akan dicek
     * @return bool
     */
    function isMember(address _memberAddress) public view returns (bool) {
        return members[_memberAddress].isRegistered;
    }
    
    // ========== BORROWING FUNCTIONS ==========
    
    /**
     * @dev Meminjam buku
     * @param _bookId ID buku yang akan dipinjam
     * @notice Anggota hanya bisa meminjam 1 buku dalam satu waktu
     */
    function borrowBook(uint _bookId) public onlyMember bookExists(_bookId) {
        require(books[_bookId].stock > 0, "Stok buku habis");
        require(currentBorrow[msg.sender] == 0, "Anda masih memiliki buku yang belum dikembalikan");
        
        // Update stok buku
        books[_bookId].stock--;
        
        // Update current borrow
        currentBorrow[msg.sender] = _bookId;
        
        // Tambah borrow count
        borrowCount++;
        
        // Simpan riwayat peminjaman
        borrowHistory[borrowCount] = BorrowHistory({
            borrowId: borrowCount,
            borrower: msg.sender,
            bookId: _bookId,
            borrowTime: block.timestamp,
            returnTime: 0,
            returned: false
        });
        
        // Update total borrowed member
        members[msg.sender].totalBorrowed++;
        
        emit BookBorrowed(borrowCount, msg.sender, _bookId, block.timestamp);
    }
    
    /**
     * @dev Mengembalikan buku
     * @param _bookId ID buku yang akan dikembalikan
     */
    function returnBook(uint _bookId) public onlyMember bookExists(_bookId) {
        require(currentBorrow[msg.sender] == _bookId, "Anda tidak meminjam buku ini");
        
        // Update stok buku
        books[_bookId].stock++;
        
        // Cari borrow history yang aktif
        for (uint i = borrowCount; i >= 1; i--) {
            if (borrowHistory[i].borrower == msg.sender && 
                borrowHistory[i].bookId == _bookId && 
                !borrowHistory[i].returned) {
                
                borrowHistory[i].returnTime = block.timestamp;
                borrowHistory[i].returned = true;
                
                emit BookReturned(i, msg.sender, _bookId, block.timestamp);
                break;
            }
        }
        
        // Reset current borrow
        currentBorrow[msg.sender] = 0;
    }
    
    /**
     * @dev Mendapatkan ID buku yang sedang dipinjam oleh user
     * @param _memberAddress Alamat anggota
     * @return uint ID buku (0 jika tidak ada)
     */
    function getCurrentBorrow(address _memberAddress) public view returns (uint) {
        return currentBorrow[_memberAddress];
    }
    
    // ========== HISTORY FUNCTIONS ==========
    
    /**
     * @dev Mendapatkan semua riwayat peminjaman
     * @return Array of BorrowHistory
     */
    function getAllBorrowHistory() public view returns (BorrowHistory[] memory) {
        BorrowHistory[] memory history = new BorrowHistory[](borrowCount);
        
        for (uint i = 1; i <= borrowCount; i++) {
            history[i - 1] = borrowHistory[i];
        }
        
        return history;
    }
    
    /**
     * @dev Mendapatkan riwayat peminjaman user tertentu
     * @param _memberAddress Alamat anggota
     * @return Array of BorrowHistory
     */
    function getMemberBorrowHistory(address _memberAddress) public view returns (BorrowHistory[] memory) {
        // Hitung jumlah peminjaman user
        uint count = 0;
        for (uint i = 1; i <= borrowCount; i++) {
            if (borrowHistory[i].borrower == _memberAddress) {
                count++;
            }
        }
        
        // Buat array dengan ukuran yang tepat
        BorrowHistory[] memory memberHistory = new BorrowHistory[](count);
        uint index = 0;
        
        for (uint i = 1; i <= borrowCount; i++) {
            if (borrowHistory[i].borrower == _memberAddress) {
                memberHistory[index] = borrowHistory[i];
                index++;
            }
        }
        
        return memberHistory;
    }
    
    /**
     * @dev Mendapatkan riwayat peminjaman untuk buku tertentu
     * @param _bookId ID buku
     * @return Array of BorrowHistory
     */
    function getBookBorrowHistory(uint _bookId) public view bookExists(_bookId) returns (BorrowHistory[] memory) {
        // Hitung jumlah peminjaman buku
        uint count = 0;
        for (uint i = 1; i <= borrowCount; i++) {
            if (borrowHistory[i].bookId == _bookId) {
                count++;
            }
        }
        
        // Buat array dengan ukuran yang tepat
        BorrowHistory[] memory bookHistory = new BorrowHistory[](count);
        uint index = 0;
        
        for (uint i = 1; i <= borrowCount; i++) {
            if (borrowHistory[i].bookId == _bookId) {
                bookHistory[index] = borrowHistory[i];
                index++;
            }
        }
        
        return bookHistory;
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    /**
     * @dev Transfer admin ke address lain
     * @param _newAdmin Alamat admin baru
     */
    function transferAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Alamat admin tidak valid");
        admin = _newAdmin;
    }
    
    /**
     * @dev Mendapatkan statistik perpustakaan
     * @return totalBooks, totalMembers, totalBorrows, activeLoans
     */
    function getLibraryStats() public view returns (uint, uint, uint, uint) {
        // Hitung active loans
        uint activeLoans = 0;
        for (uint i = 1; i <= borrowCount; i++) {
            if (!borrowHistory[i].returned) {
                activeLoans++;
            }
        }
        
        return (bookCount, memberCount, borrowCount, activeLoans);
    }
}
