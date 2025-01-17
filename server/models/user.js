const express = require('express')
const colors = require("colors")
const sendGridMail = require('@sendgrid/mail')

const router = express.Router()
const pool = require('../database/database')
const middleware = require('../controllers/middleware')
const service = require('../services')

require('dotenv').config()
sendGridMail.setApiKey(process.env.SENGRID_API_KEY);

router.post('/login', async (req, res) => {
    console.log('POST /user/login')

    var query = await pool.query("SELECT id_user FROM users WHERE email = ? AND password = ?;", [req.body.email, service.encryptPassword(req.body.password)])

    if (query.length === 0) {
        console.log('BAD RESPONSE'.red)
        return res.status(401).send({
            status: "ko"
        })
    } else {
        try {
            const accessToken = service.createToken(query[0].id_user)
            
            await pool.query("UPDATE users SET token = ? WHERE id_user = ?;", [accessToken, query[0].id_user])
            
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send({
                status: "ok",
                token: accessToken
            });
        } catch {
            console.log('BAD RESPONSE'.red)
            return res.status(500).send({
                status: "ko"
            })
        }
    }
})

router.post('/register', middleware.existsEmail ,async(req, res) => {
    console.log('POST /user/register')

    try {
        const registerToken = service.createToken(req.body.email)
        
        await pool.query("INSERT INTO users (email,password,name,surnames,isAdmin,verificationToken) VALUES (?,?,?,?,0,?);", [req.body.email, service.encryptPassword(req.body.password), req.body.name, req.body.surnames, registerToken])

        url = 'http://localhost:4200/confirmation?email='+ req.body.email + '&token=' + registerToken
        
        function getMessage() {
            console.log(url)
            const body = 'Haz click en el siguiente link para validar tu cuenta: ' + url;
            return {
                to: req.body.email,
                from: 'correoguapisimo@outlook.com',
                subject: 'Valida tu cuenta!',
                templateId: 'd-8170e316f5b542dda528d66c79116be8',
                dynamicTemplateData: {
                    subject: 'Valida tu cuenta!',
                    user: req.body.name,
                    url: url,
                },
            };
        }

        async function sendEmail() {
            try {
                await sendGridMail.send(getMessage());
                console.log('Test email sent successfully');
            } catch (error) {
                console.error('Error sending test email');
                console.error(error);
                if (error.response) {
                    console.error(error.response.body)
                }
            }
        }

        (async () => {
            console.log('Sending test email');
            await sendEmail();
        })();

        console.log('GOOD RESPONSE'.green)
        return res.status(200).send({
            status: "ok"
        });
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko server"
        });
    }
})

router.post('/validate', async (req, res) => {
    console.log('POST /user/validate')
    var result = await pool.query("UPDATE users SET isActive=1 where email = ? and verificationToken = ?;", [req.body.email, req.body.token])

    if (result.length === 0) {
        console.log('BAD RESPONSE'.red)
        return res.status(401).send({
            status: "ko"
        })
    } else {
        console.log('GOOD RESPONSE'.green)
        return res.status(200).send({
            status: "ok"
        })
    } 
})

router.post('/changePassword', async (req, res) => {
    console.log('POST /user/changePassword')

    var result = await pool.query("UPDATE users SET password = ? WHERE email = ? AND verificationToken = ?", [service.encryptPassword(req.body.password), req.body.email, req.body.token])

    if (result.length === 0) {
        console.log('BAD RESPONSE'.red)
        return res.status(401).send({
            status: "ko"
        })
    } else {
        console.log('GOOD RESPONSE'.green)
        return res.status(200).send({
            status: "ok"
        })
    } 
})

router.post('/forgot-password', middleware.existsEmailforgot, async (req, res) => {
    console.log('POST /user/forgot-password')

    url = 'http://localhost:4200/change-password?email='+ req.body.email + '&token=' + req.token
    console.log(url) 
        
    function getMessage() {
        const body = 'Haz click en el siguiente link para validar tu cuenta: ' + url;
        return {
            to: req.body.email,
            from: 'correoguapisimo@outlook.com',
            subject: 'Recupera tu contraseña!',
            templateId: 'd-528d2891cb6f4f128fa924297100acaa',
            dynamicTemplateData: {
                subject: 'Valida tu cuenta!',
                user: req.name,
                url: url,
            },
        };
    }

    async function sendEmail() {
        try {
            await sendGridMail.send(getMessage());
            console.log('Test email sent successfully');
        } catch (error) {
            console.error('Error sending test email');
            console.error(error);
            if (error.response) {
                console.error(error.response.body)
            }
        }
    }

    (async () => {
        console.log('Sending test email');
        await sendEmail();
    })();

    console.log('GOOD RESPONSE'.green)
    return res.status(200).send({
        status: "ok"
    });
})

router.post('/edit/:id', middleware.verifyToken, async (req, res) => {
    console.log('POST /user/edit')

    try {
        const query = pool.query("UPDATE users SET name = ?, surnames = ?, email = ?, password = ? WHERE id_user = ?;", [req.body.name, req.body.surnames, req.body.email, service.encryptPassword(req.body.password), req.params.id])

        if (query.affectedRows === 0) {
            console.log('BAD RESPONSE'.red)
            return res.status(400).send({
                status: "ko"
            })
        } else {
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send({
                status: "ok"
            })
        }
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.delete('/delete/:id', middleware.verifyAdminToken, async (req, res) => {
    console.log('DELETE /user/delete/', req.params.id)

    try {
        var query = await pool.query("DELETE FROM users WHERE users.id_user = ?;", [req.params.id])

        if (query.affectedRows === 0) {
            console.log('BAD RESPONSE'.red)
            return res.status(500).send({
                status: "ko"
            })
        } else {
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send({
                status: "ok"
            })
        }
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.get('/setAdmin/:id', middleware.verifyAdminToken, async (req, res) => {
    console.log('POST /user/setAdmin/', req.params.id)

    try {
        var query = await pool.query("UPDATE users SET isAdmin = 1 WHERE id_user = ?;", [req.params.id])

        if (query.affectedRows === 0) {
            console.log('BAD RESPONSE'.red)
            return res.status(500).send({
                status: "ko"
            })
        } else {
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send({
                status: "ok"
            })
        }
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.get('/getUser', middleware.verifyToken, async (req, res) => {
    console.log('GET /user/getUser')

    try {
        var result = await pool.query("SELECT id_user, name, surnames, email FROM users WHERE users.id_user = ?;", [req.sub])

        console.log('GOOD RESPONSE'.green)
        return res.status(200).send(result[0])
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.get('/getUsers', middleware.verifyAdminToken, async (req, res) => {
    console.log('GET /user/getUsers')

    try {
        var result = await pool.query("SELECT id_user, name, surnames, email FROM users where isAdmin = 0;")

        if (result.length === 0) {
            console.log('BAD RESPONSE'.red)
            return res.status(500).send({
                status: "ko"
            })
        } else {
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send(result)
        }
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.get('/getAdmin', middleware.verifyAdminToken, async (req, res) => {
    console.log('GET /user/getAdmin')

    try {
        var result = await pool.query("SELECT id_user, name, surnames, email FROM users WHERE users.id_user = ? AND isAdmin = 1;", [req.sub])

        console.log('GOOD RESPONSE'.green)
        return res.status(200).send(result[0])
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.get('/getAdmins', middleware.verifyAdminToken, async (req, res) => {
    console.log('GET /user/getAdmins')

    try {
        var result = await pool.query("SELECT id_user, name, surnames, email FROM users where isAdmin = 1;")

        if (result.length === 0) {
            console.log('BAD RESPONSE'.red)
            return res.status(500).send({
                status: "ko"
            })
        } else {
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send(result)
        }
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

router.get('/getAllUsers', middleware.verifyAdminToken, async (req, res) => {
    console.log('GET /user/getUsers')

    try {
        var result = await pool.query("SELECT id_user, name, surnames, email FROM users")

        if (result.length === 0) {
            console.log('BAD RESPONSE'.red)
            return res.status(500).send({
                status: "ko"
            })
        } else {
            console.log('GOOD RESPONSE'.green)
            return res.status(200).send(result)
        }
    } catch {
        console.log('BAD RESPONSE'.red)
        return res.status(500).send({
            status: "ko"
        })
    }
})

module.exports = router;