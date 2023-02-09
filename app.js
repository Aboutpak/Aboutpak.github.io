const express = require('express')
const session = require('express-session')
const { pool } = require('./database')
const crypto = require('crypto');
const axios = require('axios');
const app = express()


const store = new session.MemoryStore()
const discord = true
const listenPort = 3000
app.use(session({
    secret: 'secret',  //change this
    cookie: { maxAge: 3000000 },
    saveUninitialized: false,
    store: store,
    resave: true
}))

app.use(express.static(__dirname + "/public"))

app.set('view engine', 'ejs')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.get('/', async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }


    res.redirect("/home")

})

app.get('/logout', (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    req.session.user = null;
    res.redirect("/login")
})

app.get('/home', async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (req.session.user.accountType == 1) {
        const [rows, fields] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID WHERE r.PLAYERUUID=? ORDER BY OPENDATE DESC LIMIT 20", [req.session.user.playerUUID]).catch(err => {
            console.log(err);
        })

        if (rows[0]) {
            res.render("home", {
                reports: rows,
                page: 1
            })
            return;
        } else {
            res.render("home", { fail: "No Results."})
        }
    } else if (req.session.user.accountType == 2 || req.session.user.accountType == 3) {
        const [rows, fields] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID ORDER BY OPENDATE DESC LIMIT 20").catch(err => {
            console.log(err);
        })

        if (rows[0]) {
            res.render("home", {
                reports: rows,
                user: req.session.user,
                page: 1
            })
            return;
        } else {
            res.render("home", { fail: "No Results.",
            user: req.session.user })
        }
    }
})

app.post('/home', async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (isNaN(req.body.searchreportid)) {
        res.render("home", { fail: "No Results.",
        user: req.session.user })
        return;
    }

    let search = "%" + req.body.searchreportid + "%"

    if (req.session.user.accountType == 1) {
        const [rows, fields] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID WHERE r.PLAYERUUID=? AND r.ID LIKE ? ORDER BY OPENDATE DESC", [req.session.user.playerUUID, search]).catch(err => {
            console.log(err);
        })

        if (rows[0]) {
            res.render("home", {
                reports: rows
            })
            return;
        } else {
            res.render("home", {
                fail: "No Results.",
                page: 1
            })
        }
    } else if (req.session.user.accountType == 2 || req.session.user.accountType == 3) {
        const [rows, fields] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID WHERE r.ID LIKE ? ORDER BY OPENDATE DESC LIMIT 20", [search]).catch(err => {
            console.log(err);
        })

        if (rows[0]) {
            res.render("home", {
                reports: rows,
                user: req.session.user
            })
            return;
        } else {
            res.render("home", {
                fail: "No Results.",
                user: req.session.user,
                page: 1
            })
        }
    }
})

app.get('/home/:page', async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (isNaN(req.params.page)) {
        res.render("home", { fail: "No Results." })
        return;
    }

    var pageNumber = Number(req.params.page)

    let offset = (req.params.page - 1) * 20;

    if (req.session.user.accountType == 1) {
        const [rows, fields] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID WHERE r.PLAYERUUID=? ORDER BY OPENDATE DESC LIMIT 20 OFFSET ?", [req.session.user.playerUUID, offset]).catch(err => {
            console.log(err);
        })
    
        if (rows[0]) {
            res.render("home", {
                reports: rows,
                page: pageNumber
            })
            return;
        } else {
            res.render("home", {
                fail: "No Results.",
                page: pageNumber
            })
        }
    } else if (req.session.user.accountType == 2 || req.session.user.accountType == 3) {
        const [rows, fields] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID ORDER BY OPENDATE DESC LIMIT 20 OFFSET ?", [offset]).catch(err => {
            console.log(err);
        })
    
        if (rows[0]) {
            res.render("home", {
                reports: rows,
                user: req.session.user,
                page: pageNumber
            })
            return;
        } else {
            res.render("home", {
                fail: "No Results.",
                user: req.session.user,
                page: pageNumber
            })
        }
    }

    
})

app.get('/report/:reportId', async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (req.session.user.accountType == 1) {
        const [rowsInfo, fieldsInfo] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID WHERE r.ID=?", [req.params.reportId]).catch(err => {
            console.log(err);
        })
        const [rowsReply, fieldsReply] = await pool.query("SELECT * FROM Reply WHERE ID=? ORDER BY SENTDATE DESC", [req.params.reportId]).catch(err => {
            console.log(err);
        })
    
        if (rowsInfo.length !== 0){
            if (rowsInfo[0] && rowsReply.length !== 0) {
                res.render("report", {
                    report: rowsInfo[0],
                    user: req.session.user,
                    replies: rowsReply
                })
                return;
            } else if (rowsInfo[0] && rowsReply.length === 0) {
                res.render("report", {
                    report: rowsInfo[0],
                    user: req.session.user,
                    noReplies: "No Replies."
                })
            }
        } else {
            res.render("report", { fail: "No Results" })
        }
    } else if (req.session.user.accountType == 2 || req.session.user.accountType == 3) {
        const [rowsInfo, fieldsInfo] = await pool.query("SELECT r.*, p.REPORTEDUUID, p.REPORTEDNAME FROM Report r LEFT JOIN PlayerReport p ON r.ID=p.ID WHERE r.ID=?", [req.params.reportId]).catch(err => {
            console.log(err);
        })
        const [rowsReply, fieldsReply] = await pool.query("SELECT * FROM Reply WHERE ID=? ORDER BY SENTDATE DESC", [req.params.reportId]).catch(err => {
            console.log(err);
        })
    
        if (rowsInfo.length !== 0){
            if (rowsInfo[0] && rowsReply.length !== 0) {
                res.render("report", {
                    report: rowsInfo[0],
                    user: req.session.user,
                    replies: rowsReply
                })
                return;
            } else if (rowsInfo[0] && rowsReply.length == 0) {
                res.render("report", {
                    report: rowsInfo[0],
                    user: req.session.user,
                    noReplies: "No Replies."
                })
            }
        } else {
            res.render("report", { fail: "No Results" })
        }
    }

    
})

app.post("/reportAddReply", async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }
    let reportId = req.body.reportid;
    let replyText = req.body.replytext;

    const[rowsReport, fields] = await pool.query("SELECT * FROM Report WHERE ID = ? AND PLAYERUUID = ? ORDER BY OPENDATE DESC", [reportId, req.session.user.playerUUID]).catch(err => {
        console.log(err)
    })

    if (rowsReport.length > 0){
        const[rowsReply, fields] = await pool.query("SELECT * FROM Reply WHERE ID = ? ORDER BY SENTDATE DESC", [reportId]).catch(err => {
            console.log(err)
        })
        if ((rowsReply.length == 0 && req.session.user.accountType == 1) || (rowsReply.length > 0 && rowsReply[0].SENDER == req.session.user.minecraftNick && req.session.user.accountType == 1)){
            res.render("/report/" + reportId, {
                waitStaff: true
            })
            return;
        } else {
            const[rowsReply, fields] = await pool.query("INSERT INTO Reply (ID, SENDER, MESSAGE, SENTDATE) VALUES (?,?,?,?)", [reportId, req.session.user.minecraftNick, replyText, new Date()]).catch(err => {
                console.log(err)
            })

            if (discord){
                const[rowsDiscordReport, fields] = await pool.query("SELECT * FROM DiscordReport WHERE REPORTID=?", [reportId]).catch(err => {
                    console.log(err)
                })
                if (rowsDiscordReport[0]){
                    axios.post(rowsDiscordReport[0].WEBHOOK, {
                        username: req.session.user.minecraftNick,
                        avatar_url: "http://cravatar.eu/head/" + req.session.user.playerUUID +"/500",
                        content: replyText
                      })
                      .catch(function (error) {
                        console.log(error);
                      });
                }
                
            }

            res.redirect("/report/" + reportId)
            return;
        }
    } else {
        if (req.session.user.accountType != 1){
            const[rowsReply, fields] = await pool.query("INSERT INTO Reply (ID, SENDER, MESSAGE, SENTDATE) VALUES (?,?,?,?)", [reportId, req.session.user.minecraftNick, replyText, new Date()]).catch(err => {
                console.log(err)
            })

            if (discord){
                const[rowsDiscordReport, fields] = await pool.query("SELECT * FROM DiscordReport WHERE REPORTID=?", [reportId]).catch(err => {
                    console.log(err)
                })
                if (rowsDiscordReport[0]){
                    axios.post(rowsDiscordReport[0].WEBHOOK, {
                        username: req.session.user.minecraftNick,
                        avatar_url: "http://cravatar.eu/head/" + req.session.user.playerUUID +"/500",
                        content: replyText
                      })
                      .catch(function (error) {
                        console.log(error);
                      });
                }
            }
            res.redirect("/report/" + reportId)
            return;
        } else {
            res.redirect("/report/" + reportId)
        }
    }
})

app.get('/adminPanel', async (req, res) => {
    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (req.session.user.accountType == 1){
        res.redirect("/home")
        return;
    }

    const [rows, fields] = await pool.query("SELECT LOGINID, MINECRAFTNICK, PLAYERUUID, ACCOUNTTYPE FROM User ORDER BY MINECRAFTNICK ASC", [req.params.reportId, req.session.user.playerUUID]).catch(err => {
        console.log(err);
    })

    res.render("adminPanel", { users: rows,
    user: req.session.user})

})

app.post('/adminPanelRole', async (req, res) => {

    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (req.session.user.accountType != 3){
        res.redirect("/home")
        return;
    }

    let selectedRole = req.body.selectedrole;
    if (selectedRole == "User"){
        selectedRole = 1;
    } else if (selectedRole == "Staff"){
        selectedRole = 2;
    } else if (selectedRole == "Admin"){
        selectedRole = 3;
    } else {
        console.log("Error on selected role (admin panel)")
        res.redirect("/adminPanel")
        return;
    }

    const [rows, fields] = await pool.query("UPDATE User SET ACCOUNTTYPE=? WHERE PLAYERUUID=?", [selectedRole, req.body.roleplayeruuid]).catch(err => {
        console.log(err);
    })

    res.redirect("/adminPanel")
})

app.post('/adminPanelSearch', async (req, res) => {

    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (req.session.user.accountType != 3){
        res.redirect("/home")
        return;
    }

    let search = "%" + req.body.searchnick + "%"

    const [rows, fields] = await pool.query("SELECT * FROM User WHERE MINECRAFTNICK LIKE ?", [search]).catch(err => {
        console.log(err);
    })

    res.render("adminPanel", { users: rows,
        user: req.session.user})
})

app.post('/closeReport', async (req, res) => {

    if (!req.session.user) {
        res.redirect("/login")
        return;
    }

    if (req.session.user.accountType != 3 && req.session.user.accountType != 2){
        res.redirect("/home")
        return;
    }
    let status = false;
    let reportId = req.body.closeReport;
    let closeReason = req.body.closeReason;
    let closedDate = String(new Date().getTime());

    if (closeReason){
        const [rows, fields] = await pool.query("UPDATE Report SET STATUS=?, CLOSEREASON=?, CLOSEDDATE=? WHERE ID=?", [status, closeReason, closedDate, reportId]).catch(err => {
            console.log(err);
        })
    } else {
        let defaultCloseReason = "Solved."
        const [rows, fields] = await pool.query("UPDATE Report SET STATUS=?, CLOSEREASON=?, CLOSEDDATE=? WHERE ID=?", [status, defaultCloseReason, closedDate, reportId]).catch(err => {
            console.log(err);
        })
    }

    res.redirect("/report/" + reportId)
})


app.get('/login', (req, res) => {
    res.sendFile('login.html', { root: __dirname + '/public' })
})

app.post('/login', async (req, res) => {

    const hash = crypto.createHash('sha256').update(req.body.password).digest('hex');

    const [rows, fields] = await pool.query("SELECT * FROM User WHERE BINARY LOGINID= ? AND BINARY PASSWORD = ?", [req.body.loginId, hash]).catch(err => {
        console.log(err);
    })
    if (rows.length === 1) {
        req.session.user = {
            userId: rows[0].USERID,
            minecraftNick: rows[0].MINECRAFTNICK,
            playerUUID: rows[0].PLAYERUUID,
            accountType: rows[0].ACCOUNTTYPE,
            loginId: req.body.loginId
        }
        res.redirect('home')
    } else {
        res.render('login', { result: "Login Fail!" })
    }
})


app.listen(listenPort, '0.0.0.0', () => console.log("Server started on port: " + listenPort))