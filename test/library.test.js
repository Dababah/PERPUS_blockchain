// Test file untuk Library smart contract
// Jalankan dengan: truffle test

const Library = artifacts.require("Library");

contract("Library", (accounts) => {
    const admin = accounts[0];
    const member1 = accounts[1];
    const member2 = accounts[2];

    let libraryInstance;

    // Deploy contract sebelum setiap test
    beforeEach(async () => {
        libraryInstance = await Library.new({ from: admin });
    });

    // ========== TEST DEPLOYMENT ==========

    it("should deploy contract successfully", async () => {
        assert(libraryInstance.address !== "", "Contract address should not be empty");
    });

    it("should set deployer as admin", async () => {
        const contractAdmin = await libraryInstance.admin();
        assert.equal(contractAdmin, admin, "Admin should be the deployer");
    });

    it("should initialize counters to zero", async () => {
        const bookCount = await libraryInstance.bookCount();
        const memberCount = await libraryInstance.memberCount();
        const borrowCount = await libraryInstance.borrowCount();

        assert.equal(bookCount.toNumber(), 0, "Book count should be 0");
        assert.equal(memberCount.toNumber(), 0, "Member count should be 0");
        assert.equal(borrowCount.toNumber(), 0, "Borrow count should be 0");
    });

    // ========== TEST BOOK MANAGEMENT ==========

    it("should allow admin to add a book", async () => {
        const ipfsHash = "QmTest123456789";
        const stock = 5;

        const result = await libraryInstance.addBook(ipfsHash, stock, { from: admin });

        // Check event
        assert.equal(result.logs[0].event, "BookAdded", "Should emit BookAdded event");
        assert.equal(result.logs[0].args.bookId.toNumber(), 1, "Book ID should be 1");
        assert.equal(result.logs[0].args.ipfsHash, ipfsHash, "IPFS hash should match");

        // Check book data
        const book = await libraryInstance.getBook(1);
        assert.equal(book.id.toNumber(), 1, "Book ID should be 1");
        assert.equal(book.ipfsHash, ipfsHash, "IPFS hash should match");
        assert.equal(book.stock.toNumber(), stock, "Stock should match");
        assert.equal(book.exists, true, "Book should exist");
    });

    it("should not allow non-admin to add a book", async () => {
        try {
            await libraryInstance.addBook("QmTest", 5, { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("Hanya admin"), "Error message should mention admin only");
        }
    });

    it("should not allow adding book with empty IPFS hash", async () => {
        try {
            await libraryInstance.addBook("", 5, { from: admin });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("IPFS hash tidak boleh kosong"), "Error should mention empty IPFS hash");
        }
    });

    it("should not allow adding book with zero stock", async () => {
        try {
            await libraryInstance.addBook("QmTest", 0, { from: admin });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("Stok harus lebih dari 0"), "Error should mention stock requirement");
        }
    });

    it("should update book stock", async () => {
        await libraryInstance.addBook("QmTest", 5, { from: admin });
        await libraryInstance.updateBookStock(1, 10, { from: admin });

        const book = await libraryInstance.getBook(1);
        assert.equal(book.stock.toNumber(), 10, "Stock should be updated to 10");
    });

    it("should get all book IDs", async () => {
        await libraryInstance.addBook("QmTest1", 5, { from: admin });
        await libraryInstance.addBook("QmTest2", 3, { from: admin });
        await libraryInstance.addBook("QmTest3", 7, { from: admin });

        const bookIds = await libraryInstance.getAllBookIds();
        assert.equal(bookIds.length, 3, "Should have 3 books");
        assert.equal(bookIds[0].toNumber(), 1, "First book ID should be 1");
        assert.equal(bookIds[1].toNumber(), 2, "Second book ID should be 2");
        assert.equal(bookIds[2].toNumber(), 3, "Third book ID should be 3");
    });

    // ========== TEST MEMBER MANAGEMENT ==========

    it("should allow user to register as member", async () => {
        const memberName = "John Doe";

        const result = await libraryInstance.registerMember(memberName, { from: member1 });

        // Check event
        assert.equal(result.logs[0].event, "MemberRegistered", "Should emit MemberRegistered event");
        assert.equal(result.logs[0].args.memberAddress, member1, "Member address should match");
        assert.equal(result.logs[0].args.name, memberName, "Member name should match");

        // Check member data
        const member = await libraryInstance.getMember(member1);
        assert.equal(member.memberAddress, member1, "Member address should match");
        assert.equal(member.name, memberName, "Member name should match");
        assert.equal(member.isRegistered, true, "Member should be registered");
        assert.equal(member.totalBorrowed.toNumber(), 0, "Total borrowed should be 0");
    });

    it("should not allow duplicate registration", async () => {
        await libraryInstance.registerMember("John Doe", { from: member1 });

        try {
            await libraryInstance.registerMember("John Doe Again", { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("sudah terdaftar"), "Error should mention already registered");
        }
    });

    it("should not allow registration with empty name", async () => {
        try {
            await libraryInstance.registerMember("", { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("Nama tidak boleh kosong"), "Error should mention empty name");
        }
    });

    it("should check if address is member", async () => {
        await libraryInstance.registerMember("John Doe", { from: member1 });

        const isMember1 = await libraryInstance.isMember(member1);
        const isMember2 = await libraryInstance.isMember(member2);

        assert.equal(isMember1, true, "Member1 should be registered");
        assert.equal(isMember2, false, "Member2 should not be registered");
    });

    // ========== TEST BORROWING WORKFLOW ==========

    it("should allow member to borrow a book", async () => {
        // Setup: Add book and register member
        await libraryInstance.addBook("QmTest", 5, { from: admin });
        await libraryInstance.registerMember("John Doe", { from: member1 });

        // Borrow book
        const result = await libraryInstance.borrowBook(1, { from: member1 });

        // Check event
        assert.equal(result.logs[0].event, "BookBorrowed", "Should emit BookBorrowed event");
        assert.equal(result.logs[0].args.borrower, member1, "Borrower should match");
        assert.equal(result.logs[0].args.bookId.toNumber(), 1, "Book ID should be 1");

        // Check book stock decreased
        const book = await libraryInstance.getBook(1);
        assert.equal(book.stock.toNumber(), 4, "Stock should decrease to 4");

        // Check current borrow
        const currentBorrow = await libraryInstance.getCurrentBorrow(member1);
        assert.equal(currentBorrow.toNumber(), 1, "Current borrow should be book 1");

        // Check member total borrowed
        const member = await libraryInstance.getMember(member1);
        assert.equal(member.totalBorrowed.toNumber(), 1, "Total borrowed should be 1");
    });

    it("should not allow non-member to borrow", async () => {
        await libraryInstance.addBook("QmTest", 5, { from: admin });

        try {
            await libraryInstance.borrowBook(1, { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("harus terdaftar"), "Error should mention registration required");
        }
    });

    it("should not allow borrowing when stock is zero", async () => {
        await libraryInstance.addBook("QmTest", 1, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });
        await libraryInstance.registerMember("Jane", { from: member2 });

        // First member borrows
        await libraryInstance.borrowBook(1, { from: member1 });

        // Second member tries to borrow (stock is now 0)
        try {
            await libraryInstance.borrowBook(1, { from: member2 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("Stok buku habis"), "Error should mention out of stock");
        }
    });

    it("should not allow member to borrow multiple books", async () => {
        await libraryInstance.addBook("QmTest1", 5, { from: admin });
        await libraryInstance.addBook("QmTest2", 5, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });

        // Borrow first book
        await libraryInstance.borrowBook(1, { from: member1 });

        // Try to borrow second book
        try {
            await libraryInstance.borrowBook(2, { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("belum dikembalikan"), "Error should mention unreturned book");
        }
    });

    it("should allow member to return a book", async () => {
        // Setup
        await libraryInstance.addBook("QmTest", 5, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });
        await libraryInstance.borrowBook(1, { from: member1 });

        // Return book
        const result = await libraryInstance.returnBook(1, { from: member1 });

        // Check event
        assert.equal(result.logs[0].event, "BookReturned", "Should emit BookReturned event");
        assert.equal(result.logs[0].args.borrower, member1, "Borrower should match");
        assert.equal(result.logs[0].args.bookId.toNumber(), 1, "Book ID should be 1");

        // Check book stock increased
        const book = await libraryInstance.getBook(1);
        assert.equal(book.stock.toNumber(), 5, "Stock should return to 5");

        // Check current borrow reset
        const currentBorrow = await libraryInstance.getCurrentBorrow(member1);
        assert.equal(currentBorrow.toNumber(), 0, "Current borrow should be 0");
    });

    it("should not allow returning book not borrowed", async () => {
        await libraryInstance.addBook("QmTest", 5, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });

        try {
            await libraryInstance.returnBook(1, { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("tidak meminjam"), "Error should mention not borrowing");
        }
    });

    // ========== TEST HISTORY ==========

    it("should track borrow history", async () => {
        // Setup
        await libraryInstance.addBook("QmTest", 5, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });

        // Borrow and return
        await libraryInstance.borrowBook(1, { from: member1 });
        await libraryInstance.returnBook(1, { from: member1 });

        // Get history
        const history = await libraryInstance.getAllBorrowHistory();
        assert.equal(history.length, 1, "Should have 1 history entry");
        assert.equal(history[0].borrower, member1, "Borrower should match");
        assert.equal(history[0].bookId.toNumber(), 1, "Book ID should be 1");
        assert.equal(history[0].returned, true, "Should be marked as returned");
        assert(history[0].returnTime.toNumber() > 0, "Return time should be set");
    });

    it("should get member-specific borrow history", async () => {
        // Setup
        await libraryInstance.addBook("QmTest1", 5, { from: admin });
        await libraryInstance.addBook("QmTest2", 5, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });
        await libraryInstance.registerMember("Jane", { from: member2 });

        // Member1 borrows and returns book 1
        await libraryInstance.borrowBook(1, { from: member1 });
        await libraryInstance.returnBook(1, { from: member1 });

        // Member2 borrows book 2
        await libraryInstance.borrowBook(2, { from: member2 });

        // Get member1 history
        const member1History = await libraryInstance.getMemberBorrowHistory(member1);
        assert.equal(member1History.length, 1, "Member1 should have 1 history entry");
        assert.equal(member1History[0].bookId.toNumber(), 1, "Book ID should be 1");
    });

    it("should get book-specific borrow history", async () => {
        // Setup
        await libraryInstance.addBook("QmTest", 5, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });
        await libraryInstance.registerMember("Jane", { from: member2 });

        // Multiple borrows of same book
        await libraryInstance.borrowBook(1, { from: member1 });
        await libraryInstance.returnBook(1, { from: member1 });
        await libraryInstance.borrowBook(1, { from: member2 });

        // Get book history
        const bookHistory = await libraryInstance.getBookBorrowHistory(1);
        assert.equal(bookHistory.length, 2, "Book should have 2 history entries");
    });

    // ========== TEST UTILITY FUNCTIONS ==========

    it("should get library statistics", async () => {
        // Setup
        await libraryInstance.addBook("QmTest1", 5, { from: admin });
        await libraryInstance.addBook("QmTest2", 3, { from: admin });
        await libraryInstance.registerMember("John", { from: member1 });
        await libraryInstance.registerMember("Jane", { from: member2 });
        await libraryInstance.borrowBook(1, { from: member1 });

        const stats = await libraryInstance.getLibraryStats();
        assert.equal(stats[0].toNumber(), 2, "Total books should be 2");
        assert.equal(stats[1].toNumber(), 2, "Total members should be 2");
        assert.equal(stats[2].toNumber(), 1, "Total borrows should be 1");
        assert.equal(stats[3].toNumber(), 1, "Active loans should be 1");
    });

    it("should allow admin transfer", async () => {
        await libraryInstance.transferAdmin(member1, { from: admin });

        const newAdmin = await libraryInstance.admin();
        assert.equal(newAdmin, member1, "Admin should be transferred");
    });

    it("should not allow non-admin to transfer admin", async () => {
        try {
            await libraryInstance.transferAdmin(member2, { from: member1 });
            assert.fail("Should have thrown an error");
        } catch (error) {
            assert(error.message.includes("Hanya admin"), "Error should mention admin only");
        }
    });
});
