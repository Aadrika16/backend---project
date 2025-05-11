const express = require("express") ;
const app = express() ;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const cors = require('cors');

const path = require("path"); 
const {open} = require("sqlite"); 
const sqlite3 = require("sqlite3"); 
const dbPath = path.join(__dirname , "loan.db") ; 
app.use(cors()); 
app.use(express.json()); 
let db=null; 
const initializeDbServer = async ()=>{
    try{
        db=await open({
            filename:dbPath,
            driver : sqlite3.Database,
        });
        app.listen(3000 , ()=>{
            console.log("Server Running at http://localhost:3000/")});
    }catch(error){
        console.log(`DB Error: ${error.message}`) 
        process.exit(1);
    }
    
};
initializeDbServer(); 
//Register user 

app.post("/register" , async (req,res)=>{
    const {username  ,password , role,email}=req.body ; 
    const hashedPassword = await bcrypt.hash(password,10);
    const selectUserQuery = `SELECT  * FROM users WHERE username= ? ` ; 
    const dbUser = await db.get(selectUserQuery , [username]) ;
    if (dbUser === undefined){
         const createUserQuery = `
            INSERT INTO 
                users(username, password, role,email) 
            VALUES 
                (?,?,?,?)`;
        const dbResponse = await db.run(createUserQuery , [username,hashedPassword,role , email] );
        
        const newUserId = dbResponse.lastID;
        res.send(`Created new user with ${newUserId}`);
    }
    else {
         res.status(400).send("User already exists");
    }

})
//login user 

app.post("/login" , async (request , response)=>{
  const {username , password} = request.body 
  const selectUserQuery = `SELECT * FROM users WHERE username = ? ` ;
  const dbUser = await db.get(selectUserQuery , [username]);
  if (dbUser===undefined){
    return response.status(400).send("Invalid User");
  }
  else {
     const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: dbUser.name,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    }
    else {
      response.status(400).send({"message":"Invalid Password"});
    }
    }
})
//apply loan 

app.post("/apply" , async (req , res)=>{
    const {fullName,amountNeeded, loanTenture, employmentStatus,reason , employmentAddress}=req.body; 
    const selectUserQuery = `SELECT * FROM loan_applications WHERE fullName = ?`;
    const dbUser = await db.get(selectUserQuery , [fullName]);  
    if (dbUser===undefined){
        const createUserQuery = `INSERT INTO loan_applications (fullName,amountNeeded, loanTenture, employmentStatus,reason , employmentAddress)VALUES(?,?,?,?,?,?) `;
        const dbResponse = await db.run( createUserQuery,[fullName,amountNeeded, loanTenture, employmentStatus,reason , employmentAddress]); 
        const newUserId = dbResponse.lastID; 
        res.send(`Created new user with ${newUserId}`); 
    }else{
         res.status = 400;
        res.send("User already exists");
    }
})

//get dashIcons 

app.get("/dashIcons" , async (req , res)=>{
    const getIconsQuery = `SELECT  * FROM dash_icons`; 
    const dbUser = await db.all(getIconsQuery); 
    res.send(dbUser)
})
//get user loans 

app.get("/loans" , async (req , res)=>{
    const getAllRows = `SELECT * FROM loan_applications` 
    const dbUser = await db.all(getAllRows); 
    res.send(dbUser)

})

//update rows

app.put('/loans/:id', (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    employmentStatus,
    employmentAddress,
    reason,
    amountNeeded,
    loanTenture,
    status
  } = req.body;

  db.run(
    `UPDATE loan_applications SET fullName = ?, employmentStatus = ?, employmentAddress = ?, reason = ?, amountNeeded = ?, loanTenture = ?, status = ? WHERE id = ?`,
    [
      fullName,
      employmentStatus,
      employmentAddress,
      reason,
      amountNeeded,
      loanTenture,
     
      status,
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.send({ message: 'Loan fully updated', changes: this.changes });
    }
  );
});

//get user for dashboard 

app.post("/user/data", async (req, res) => {
  try {
    const { fullName } = req.body;

    const getUser = `SELECT * FROM loan_applications WHERE fullName = ?`;
    const dbUser = await db.get(getUser, [fullName]);

    if (!dbUser) {
      return res.status(404).json({ message: "User Not Found" }); // ✅ JSON response
    } else {
      return res.status(200).json(dbUser); // ✅ JSON response
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal Server Error" }); // ✅ JSON response
  }
});

