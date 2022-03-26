const anchor = require("@project-serum/anchor");
const web3 = require("@solana/web3.js");
const spl = require("@solana/spl-token");
const connection = new web3.Connection("https://api.devnet.solana.com");
const fs = require("fs");
let program = null;
async function initializeProgram(){
    const file = fs.readFileSync("./airdrops.json", "utf8");
    const idl = JSON.parse(file);
    let dummyWallet = new anchor.Wallet(anchor.web3.Keypair.generate());
    const provider = new anchor.Provider(connection, dummyWallet);
    program = new anchor.Program(idl, idl.metadata.address, provider);
};
const functions = {
    async updateUserTwitter(twitterId){
        await program.rpc.updateUser(new anchor.BN(twitterId), true, {
            accounts: {
              userAccount: userAccount.publicKey,
            },
      });
    },
    async updateUserTaskCompleted(){
        await initializeProgram();
        let users = await program.account.user.all();
        console.log(users[0].account.walletKey.toBase58());
        //await program.rpc.userTaskCompleted({
        //    accounts: {
        //      userAccount: userAccount.publicKey,
        //      projectAccount: projectAccount.publicKey,
        //    },
        //});
    }
}
exports.helpers = functions;