/**
 * Library Blockchain - Web3.js Integration
 * 
 * CONTRACT DEPLOYED TO SEPOLIA:
 * Address: 0x190f3557ae406b7720B77e8aa4E4E7B27E3a3727
 * Etherscan: https://sepolia.etherscan.io/address/0x190f3557ae406b7720B77e8aa4E4E7B27E3a3727
 */

// ========== CONFIGURATION ==========

const CONTRACT_ADDRESS = '0x190f3557ae406b7720B77e8aa4E4E7B27E3a3727';

// ABI will be fetched from ./abi/Library.json
let CONTRACT_ABI;

// Pinata Gateway untuk fetch metadata
const IPFS_GATEWAY = 'https://gray-brilliant-beaver-208.mypinata.cloud/ipfs/';
// CID Metadata Buku (5 buku) - Copy CID ini saat menambahkan buku sebagai admin
const BOOK_METADATA_CIDS = [
    'bafkreihk3n4tqlu7czesfjvf5w55rtt7xp6ewdrwmu2dqcfeputoxankkq', // Buku 1: 33 Cara Kaya Ala Bob Sadino
    'bafkreiekqdhdlrak5ky3ufi7wwb6r6uqklueppvhzrfy25bxjskrvropmi', // Buku 2
    'bafkreihrlag77vqh6y4dh3lbb2n3namibvv45zpccgtg6dgonwvyznoxhq', // Buku 3
    'bafkreicet65l74wqf57fmsg7bbcfsocqhyghd5iqhgb64kzg6atdgl5k4i', // Buku 4
    'bafkreid7ivm5mtjipzvsqpv6olswxfm5mwwvg6cm5xvwv6bmk2biwyoqc4'  // Buku 5
];

// ========== GLOBAL VARIABLES ==========

let web3;
let contract;
let currentAccount;
let isAdmin = false;
let isMember = false;

// ========== INITIALIZATION ==========

window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask detected!');
        setupEventListeners();
    } else {
        alert('Please install MetaMask to use this DApp!');
    }
});

// ========== EVENT LISTENERS ==========

function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('addBookBtn').addEventListener('click', addBook);
    document.getElementById('registerBtn').addEventListener('click', registerMember);
    document.getElementById('showAllHistory').addEventListener('click', () => loadHistory('all'));
    document.getElementById('showMyHistory').addEventListener('click', () => loadHistory('my'));

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
    }

    // Populate Quick Fill Dropdown
    const quickFillSelect = document.getElementById('quickFill');
    if (quickFillSelect) {
        const bookTitles = [
            "33 Cara Kaya Ala Bob Sadino",
            "Book 2 (Metadata)",
            "Book 3 (Metadata)",
            "Book 4 (Metadata)",
            "Book 5 (Metadata)"
        ];

        BOOK_METADATA_CIDS.forEach((cid, index) => {
            const option = document.createElement('option');
            option.value = cid;
            option.textContent = bookTitles[index] || `Book ${index + 1}`;
            quickFillSelect.appendChild(option);
        });

        quickFillSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('ipfsHash').value = e.target.value;
            }
        });
    }
}

// ========== WALLET CONNECTION ==========

async function connectWallet() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Fetch ABI
        const response = await fetch('./abi/Library.json');
        CONTRACT_ABI = await response.json();

        web3 = new Web3(window.ethereum);
        currentAccount = accounts[0];

        const chainId = await web3.eth.getChainId();
        if (chainId !== 11155111) {
            alert('Please switch to Sepolia Testnet in MetaMask!');
            return;
        }

        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

        document.getElementById('connectWallet').style.display = 'none';
        document.getElementById('accountInfo').style.display = 'flex'; // Changed to flex
        document.getElementById('accountAddress').textContent =
            currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);

        // Hide Welcome Card
        const welcomeCard = document.getElementById('welcomeCard');
        if (welcomeCard) welcomeCard.style.display = 'none';

        // Try to get admin address
        let adminAddress;
        try {
            adminAddress = await contract.methods.admin().call();
            console.log('Admin address:', adminAddress);
        } catch (e) {
            console.error('Failed to get admin address:', e);
            throw new Error('Failed to connect to contract. Check network or contract address.');
        }

        isAdmin = currentAccount.toLowerCase() === adminAddress.toLowerCase();

        try {
            isMember = await contract.methods.isMember(currentAccount).call();
            console.log('Is member:', isMember);
        } catch (e) {
            console.error('Failed to check membership:', e);
            // Don't block if this fails, just assume false
            isMember = false;
        }

        const userRoleEl = document.getElementById('userRole');
        const memberStatusEl = document.getElementById('memberStatus');

        if (userRoleEl) {
            userRoleEl.textContent = isAdmin ? 'Admin' : 'User';
            userRoleEl.style.display = 'inline-block';
            userRoleEl.className = isAdmin ? 'status-badge status-out' : 'status-badge status-available';
        }

        if (memberStatusEl) {
            memberStatusEl.textContent = isMember ? 'Member' : 'Guest';
            memberStatusEl.style.display = 'inline-block';
            memberStatusEl.className = isMember ? 'status-badge status-available' : 'status-badge status-out';
        }

        if (isAdmin) {
            document.getElementById('adminNavLink').style.display = 'flex';
            await loadMembers();
        }

        if (!isMember && !isAdmin) {
            document.getElementById('registrationSection').style.display = 'block';
        }

        await loadLibraryStats();
        await loadBooks();
        await loadHistory('all');

        if (isMember) {
            await loadCurrentBorrow();
        }

        showMessage('success', 'Connected to MetaMask successfully!', 'globalMessage');

    } catch (error) {
        console.error('Error connecting wallet:', error);
        showMessage('error', 'Failed to connect wallet: ' + error.message, 'globalMessage');
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        location.reload();
    } else if (accounts[0] !== currentAccount) {
        location.reload();
    }
}

// ========== LIBRARY STATISTICS ==========

async function loadLibraryStats() {
    try {
        const stats = await contract.methods.getLibraryStats().call();

        document.getElementById('totalBooks').textContent = stats[0];
        document.getElementById('totalMembers').textContent = stats[1];
        document.getElementById('totalBorrows').textContent = stats[2];
        document.getElementById('activeLoans').textContent = stats[3];

    } catch (error) {
        console.error('Error loading stats:', error);
        showMessage('error', 'Failed to load stats: ' + error.message, 'globalMessage');
    }
}

// ========== ADMIN FUNCTIONS ==========

async function addBook() {
    const ipfsHash = document.getElementById('ipfsHash').value.trim();
    const stock = document.getElementById('bookStock').value;

    if (!ipfsHash) {
        showMessage('error', 'Please enter IPFS CID!', 'adminMessage');
        return;
    }

    if (!stock || stock < 1) {
        showMessage('error', 'Please enter valid stock (minimum 1)!', 'adminMessage');
        return;
    }

    try {
        showMessage('info', 'Adding book to blockchain... Please confirm transaction in MetaMask.', 'adminMessage');

        const result = await contract.methods.addBook(ipfsHash, stock).send({
            from: currentAccount,
            gas: 500000
        });

        console.log('Book added:', result);

        showMessage('success',
            `Book added successfully! Transaction: ${result.transactionHash}`,
            'adminMessage'
        );

        document.getElementById('ipfsHash').value = '';
        document.getElementById('bookStock').value = '';

        await loadLibraryStats();
        await loadBooks();

    } catch (error) {
        console.error('Error adding book:', error);
        showMessage('error', 'Failed to add book: ' + error.message, 'adminMessage');
    }
}

async function loadMembers() {
    const loadingEl = document.getElementById('loadingMembers');
    const membersListBody = document.getElementById('membersListBody');
    const noMembersEl = document.getElementById('noMembersMessage');

    try {
        loadingEl.style.display = 'block';
        membersListBody.innerHTML = '';
        noMembersEl.style.display = 'none';

        // Fetch MemberRegistered events from block 0 to latest
        const events = await contract.getPastEvents('MemberRegistered', {
            fromBlock: 0,
            toBlock: 'latest'
        });

        if (events.length === 0) {
            loadingEl.style.display = 'none';
            noMembersEl.style.display = 'block';
            return;
        }

        // Process events to get unique members (in case of re-registration logic, though contract prevents it)
        const members = events.map(event => ({
            address: event.returnValues.memberAddress,
            name: event.returnValues.name,
            timestamp: event.returnValues.timestamp
        }));

        members.forEach(member => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border)';

            const date = new Date(member.timestamp * 1000).toLocaleDateString();

            row.innerHTML = `
                <td style="padding: 15px; color: white;">${member.name}</td>
                <td style="padding: 15px; font-family: monospace; color: var(--primary);">${member.address}</td>
            `;
            membersListBody.appendChild(row);
        });

        loadingEl.style.display = 'none';

    } catch (error) {
        console.error('Error loading members:', error);
        loadingEl.style.display = 'none';
        showMessage('error', 'Failed to load members: ' + error.message, 'adminMessage');
    }
}

// ========== MEMBER FUNCTIONS ==========

async function registerMember() {
    const name = document.getElementById('memberName').value.trim();

    if (!name) {
        showMessage('error', 'Please enter your name!', 'registerMessage');
        return;
    }

    try {
        showMessage('info', 'Registering... Please confirm transaction in MetaMask.', 'registerMessage');

        const result = await contract.methods.registerMember(name).send({
            from: currentAccount,
            gas: 300000
        });

        console.log('Member registered:', result);

        showMessage('success',
            `Registration successful! Transaction: ${result.transactionHash}`,
            'registerMessage'
        );

        isMember = true;

        // Update member status UI
        const memberStatusEl = document.getElementById('memberStatus');
        if (memberStatusEl) {
            memberStatusEl.textContent = 'Member';
            memberStatusEl.className = 'status-badge status-available';
        }

        document.getElementById('registrationSection').style.display = 'none';

        await loadLibraryStats();
        await loadBooks();
        await loadMembers();

    } catch (error) {
        console.error('Error registering:', error);
        showMessage('error', 'Failed to register: ' + error.message, 'registerMessage');
    }
}

// ========== BOOK FUNCTIONS ==========

async function loadBooks() {
    const loadingEl = document.getElementById('loadingBooks');
    const booksListEl = document.getElementById('booksList');
    const noBooksEl = document.getElementById('noBooksMessage');

    try {
        console.log('Starting loadBooks...');
        loadingEl.style.display = 'block';
        booksListEl.innerHTML = '';
        noBooksEl.style.display = 'none';

        console.log('Calling getAllBookIds...');
        const bookIds = await contract.methods.getAllBookIds().call();
        console.log('Book IDs fetched:', bookIds);

        if (bookIds.length === 0) {
            console.log('No books found.');
            loadingEl.style.display = 'none';
            noBooksEl.style.display = 'block';
            return;
        }

        for (let i = 0; i < bookIds.length; i++) {
            const bookId = bookIds[i];
            console.log(`Fetching book details for ID ${bookId}...`);
            const book = await contract.methods.getBook(bookId).call();

            let metadata = null;
            try {
                console.log(`Fetching IPFS metadata for ${book.ipfsHash}...`);
                // Add 5 second timeout for IPFS
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(IPFS_GATEWAY + book.ipfsHash, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                metadata = await response.json();
                console.log('Metadata fetched successfully.');
            } catch (error) {
                console.error('Error fetching metadata for book', bookId, error);
                metadata = {
                    name: 'Book #' + bookId,
                    description: 'Metadata not available (IPFS Timeout/Error)',
                    attributes: []
                };
            }

            const bookCard = createBookCard(book, metadata);
            booksListEl.appendChild(bookCard);
        }

        loadingEl.style.display = 'none';
        console.log('Finished loading books.');

    } catch (error) {
        console.error('Error loading books:', error);
        loadingEl.style.display = 'none';
        showMessage('error', 'Failed to load books: ' + error.message, 'adminMessage');
    }
}

function createBookCard(book, metadata) {
    const card = document.createElement('div');
    card.className = 'book-card';

    const getBookId = () => {
        if (metadata.attributes && metadata.attributes.length > 0) {
            const bookIdAttr = metadata.attributes.find(a => a.trait_type === 'bookId');
            return bookIdAttr ? bookIdAttr.value : book.id;
        }
        return book.id;
    };

    let stockClass = 'status-available';
    let stockText = 'Available';
    if (book.stock == 0) {
        stockClass = 'status-out';
        stockText = 'Out of Stock';
    }

    // Truncate IPFS Hash for display
    const shortIpfs = book.ipfsHash.substring(0, 10) + '...' + book.ipfsHash.substring(book.ipfsHash.length - 4);

    card.innerHTML = `
        <div class="book-icon-placeholder">
            <i class="fas fa-book-open"></i>
        </div>
        
        <div class="book-status">
            <span class="status-badge ${stockClass}">${stockText}</span>
        </div>

        <h3 class="book-title">${metadata.name || 'Unknown Book'}</h3>
        <p class="book-author"><i class="far fa-user"></i> ${metadata.author || 'Unknown Author'}</p>
        
        <div class="book-meta-info">
            <div class="meta-row">
                <i class="fas fa-cubes"></i> <span>Stock: ${book.stock}/${book.totalCopies}</span>
            </div>
        </div>

        <div class="ipfs-box">
            <span class="ipfs-label">IPFS CID</span>
            <div class="ipfs-value">
                ${shortIpfs}
                <a href="${IPFS_GATEWAY + book.ipfsHash}" target="_blank" style="color: var(--primary);"><i class="fas fa-external-link-alt"></i></a>
            </div>
        </div>
        
        <div class="book-actions" id="actions-${book.id}" style="width: 100%;">
            ${isMember ? createBookActions(book) : '<button class="btn btn-secondary btn-full" disabled>Register to Borrow</button>'}
        </div>
    `;

    return card;
}

function createBookActions(book) {
    const currentBorrowId = localStorage.getItem('currentBorrow_' + currentAccount);

    if (currentBorrowId == book.id) {
        return `<button class="btn btn-danger btn-full" onclick="returnBook(${book.id})">Return Book</button>`;
    } else if (currentBorrowId && currentBorrowId != '0') {
        return `<button class="btn btn-secondary btn-full" disabled>Active Loan Exists</button>`;
    } else if (book.stock > 0) {
        return `<button class="btn btn-primary btn-full" onclick="borrowBook(${book.id})">Borrow Book</button>`;
    } else {
        return `<button class="btn btn-secondary btn-full" disabled>Out of Stock</button>`;
    }
}

async function borrowBook(bookId) {
    try {
        showMessage('info', 'Borrowing book... Please confirm transaction in MetaMask.', 'adminMessage');

        const result = await contract.methods.borrowBook(bookId).send({
            from: currentAccount,
            gas: 400000
        });

        console.log('Book borrowed:', result);

        showMessage('success',
            `Book borrowed successfully! Transaction: ${result.transactionHash}`,
            'adminMessage'
        );

        localStorage.setItem('currentBorrow_' + currentAccount, bookId);

        await loadLibraryStats();
        await loadBooks();
        await loadHistory('all');
        await loadCurrentBorrow();

    } catch (error) {
        console.error('Error borrowing book:', error);
        showMessage('error', 'Failed to borrow book: ' + error.message, 'adminMessage');
    }
}

async function returnBook(bookId) {
    try {
        showMessage('info', 'Returning book... Please confirm transaction in MetaMask.', 'adminMessage');

        const result = await contract.methods.returnBook(bookId).send({
            from: currentAccount,
            gas: 400000
        });

        console.log('Book returned:', result);

        showMessage('success',
            `Book returned successfully! Transaction: ${result.transactionHash}`,
            'adminMessage'
        );

        localStorage.setItem('currentBorrow_' + currentAccount, '0');

        await loadLibraryStats();
        await loadBooks();
        await loadHistory('all');
        await loadCurrentBorrow();

    } catch (error) {
        console.error('Error returning book:', error);
        showMessage('error', 'Failed to return book: ' + error.message, 'adminMessage');
    }
}

async function loadCurrentBorrow() {
    try {
        const currentBorrowId = await contract.methods.getCurrentBorrow(currentAccount).call();

        if (currentBorrowId > 0) {
            document.getElementById('currentBorrowSection').style.display = 'block';

            const book = await contract.methods.getBook(currentBorrowId).call();

            let metadata = { name: 'Book #' + currentBorrowId };
            try {
                const response = await fetch(IPFS_GATEWAY + book.ipfsHash);
                metadata = await response.json();
            } catch (error) {
                console.error('Error fetching metadata:', error);
            }

            document.getElementById('currentBorrowInfo').innerHTML = `
                <div class="history-card" style="border-color: var(--accent-orange);">
                    <div class="history-left">
                        <div class="history-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--accent-orange);">
                            <i class="fas fa-book-reader"></i>
                        </div>
                        <div class="history-info">
                            <h4>${metadata.name}</h4>
                            <div class="history-sub">
                                <span><i class="fas fa-clock"></i> Active Loan</span>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-danger" onclick="returnBook(${currentBorrowId})">Return Book</button>
                </div>
            `;

            localStorage.setItem('currentBorrow_' + currentAccount, currentBorrowId);
        } else {
            document.getElementById('currentBorrowSection').style.display = 'none';
            localStorage.setItem('currentBorrow_' + currentAccount, '0');
        }

    } catch (error) {
        console.error('Error loading current borrow:', error);
    }
}

// ========== HISTORY FUNCTIONS ==========

async function loadHistory(type) {
    const historyListEl = document.getElementById('historyList');
    const loadingHistoryEl = document.getElementById('loadingHistory');
    const noHistoryEl = document.getElementById('noHistoryMessage');

    try {
        loadingHistoryEl.style.display = 'block';
        historyListEl.innerHTML = '';
        noHistoryEl.style.display = 'none';

        const borrowCount = await contract.methods.borrowCount().call();

        if (borrowCount == 0) {
            loadingHistoryEl.style.display = 'none';
            noHistoryEl.style.display = 'block';
            return;
        }

        let historyItems = [];

        for (let i = 1; i <= borrowCount; i++) {
            const borrow = await contract.methods.borrowHistory(i).call();

            if (type === 'my' && borrow.borrower.toLowerCase() !== currentAccount.toLowerCase()) {
                continue;
            }

            historyItems.push(borrow);
        }

        if (historyItems.length === 0) {
            loadingHistoryEl.style.display = 'none';
            noHistoryEl.style.display = 'block';
            return;
        }

        historyItems.reverse();

        for (const borrow of historyItems) {
            const book = await contract.methods.getBook(borrow.bookId).call();

            // Fetch member details to get name
            let borrowerName = 'Unknown';
            try {
                const member = await contract.methods.getMember(borrow.borrower).call();
                if (member.isRegistered) {
                    borrowerName = member.name;
                }
            } catch (e) {
                console.error('Error fetching member details:', e);
            }

            let metadata = { name: 'Book #' + borrow.bookId };
            try {
                const response = await fetch(IPFS_GATEWAY + book.ipfsHash);
                metadata = await response.json();
            } catch (error) {
                console.error('Error fetching metadata:', error);
            }

            const historyCard = createHistoryCard(borrow, metadata, borrowerName);
            historyListEl.appendChild(historyCard);
        }

        loadingHistoryEl.style.display = 'none';

    } catch (error) {
        console.error('Error loading history:', error);
        loadingHistoryEl.style.display = 'none';
        showMessage('error', 'Failed to load history: ' + error.message, 'adminMessage');
    }
}

function createHistoryCard(borrow, metadata, borrowerName) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const borrowDate = new Date(borrow.borrowTime * 1000).toLocaleDateString();
    const returnDate = borrow.returned ? new Date(borrow.returnTime * 1000).toLocaleDateString() : '-';

    // Calculate Due Date (e.g., +14 days)
    const dueDate = new Date(borrow.borrowTime * 1000 + (14 * 24 * 60 * 60 * 1000)).toLocaleDateString();

    const statusClass = borrow.returned ? 'h-status-returned' : 'h-status-active';
    const statusText = borrow.returned ? 'Returned' : 'Active Loan';

    card.innerHTML = `
        <div class="history-left">
            <div class="history-icon">
                <i class="fas fa-book"></i>
            </div>
            <div class="history-info">
                <h4>${metadata.name || 'Unknown Book'}</h4>
                <div class="history-sub">
                    <span><i class="far fa-user"></i> ${borrowerName}</span>
                    <span><i class="fas fa-fingerprint"></i> ${borrow.borrower.substring(0, 6)}...${borrow.borrower.substring(38)}</span>
                </div>
            </div>
        </div>
        
        <div class="history-right">
            <div class="history-sub" style="margin-bottom: 8px;">
                <span><i class="far fa-calendar-alt"></i> Borrowed: ${borrowDate}</span>
                <span><i class="far fa-clock"></i> ${borrow.returned ? 'Returned: ' + returnDate : 'Due: ' + dueDate}</span>
            </div>
            <div style="text-align: right;">
                <span class="history-status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
    `;

    return card;
}

// ========== UTILITY FUNCTIONS ==========

function showMessage(type, message, elementId) {
    let messageEl = document.getElementById(elementId);

    // Fallback to global message if specific element not found or hidden (and not globalMessage itself)
    if (!messageEl || (messageEl.offsetParent === null && elementId !== 'globalMessage')) {
        messageEl = document.getElementById('globalMessage');
    }

    if (!messageEl) return;

    messageEl.className = `message-toast ${type}`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}