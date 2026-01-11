const Library = artifacts.require("Library");

module.exports = async function (callback) {
    try {
        const library = await Library.deployed();
        console.log("Library contract found at:", library.address);

        const bookCIDs = [
            'bafkreihk3n4tqlu7czesfjvf5w55rtt7xp6ewdrwmu2dqcfeputoxankkq', // Buku 1: 33 Cara Kaya Ala Bob Sadino
            'bafkreiekqdhdlrak5ky3ufi7wwb6r6uqklueppvhzrfy25bxjskrvropmi', // Buku 2
            'bafkreihrlag77vqh6y4dh3lbb2n3namibvv45zpccgtg6dgonwvyznoxhq', // Buku 3
            'bafkreicet65l74wqf57fmsg7bbcfsocqhyghd5iqhgb64kzg6atdgl5k4i', // Buku 4
            'bafkreid7ivm5mtjipzvsqpv6olswxfm5mwwvg6cm5xvwv6bmk2biwyoqc4'  // Buku 5
        ];

        const stock = 5;

        console.log(`Adding ${bookCIDs.length} books with stock ${stock} each...`);

        for (let i = 0; i < bookCIDs.length; i++) {
            const cid = bookCIDs[i];
            console.log(`Adding book ${i + 1}/${bookCIDs.length}: ${cid}`);

            try {
                const tx = await library.addBook(cid, stock);
                console.log(`✅ Book added! Tx: ${tx.tx}`);
            } catch (error) {
                console.error(`❌ Failed to add book ${cid}:`, error.message);
            }
        }

        console.log("All operations completed.");
        callback();
    } catch (error) {
        console.error("Script error:", error);
        callback(error);
    }
};
