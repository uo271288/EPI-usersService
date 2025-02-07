const express = require('express');
const database = require("../database");
const bcrypt = require('bcryptjs');

const {
    generateTokens,
    authenticateToken,
    isTeacher,
} = require('../auth');
require('dotenv').config();

const routerTeachers = express.Router();

routerTeachers.post("/", async (req, res) => {

    let {
        name,
        lastName,
        email,
        password,
        teachingStage,
        schoolType,
        schoolLocation,
        gender,
        experienceYears,
        community
    } = req.body;

    if (!name?.trim()) {
        return res.status(400).json({error: {name: "signup.error.name"}});
    }

    if (!lastName?.trim()) {
        return res.status(400).json({error: {lastName: "signup.error.lastName"}});
    }

    if (!email?.trim()) {
        return res.status(400).json({error: {email: "signup.error.email"}});
    }

    if (!password?.trim()) {
        return res.status(400).json({error: {password: "signup.error.password.empty"}});
    }

    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(400).json({error: {email: "signup.error.email.format"}});
    }

    let teacher = null;
    try {
        let teacherEmail = await database.query('SELECT email FROM teachers WHERE email = ?', [email]);

        if (teacherEmail.length > 0) {
            return res.status(404).json({error: {email: "signup.error.email.repeated"}});
        }
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        teacher = await database.query('INSERT INTO teachers (name,lastName,email,password,teachingStage,schoolType,schoolLocation,gender,experienceYears,community) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [name,
                lastName,
                email,
                hashedPassword,
                teachingStage,
                schoolType,
                schoolLocation,
                gender,
                experienceYears,
                community]);
    } catch (e) {
        return res.status(500).json({error: {type: "internalServerError", message: e}});
    } finally {

    }

    res.status(200).json({inserted: teacher});
});

routerTeachers.post("/login", async (req, res) => {

    let {email, password} = req.body;

    if (!email?.trim()) {
        return res.status(400).json({error: {email: "login.error.email.empty"}});
    }

    if (!password?.trim()) {
        return res.status(400).json({error: {password: "login.error.password.empty"}});
    }


    let teacher = null;
    try {
        let teacherEmail = await database.query('SELECT email FROM teachers WHERE email = ?', [email]);

        if (teacherEmail.length <= 0) {
            return res.status(404).json({error: {email: "login.error.email.notExist"}});
        }

        teacher = await database.query('SELECT id, email, name, password FROM teachers WHERE email = ?', [email]);

        const isMatch = await bcrypt.compare(password, teacher[0].password);

        if (!isMatch) {
            return res.status(401).json({error: {password: "login.error.password.incorrect"}});
        }
    } catch (e) {
        return res.status(500).json({error: {type: "internalServerError", message: e}});
    } finally {

    }

    let user = {
        username: teacher[0].username,
        id: teacher[0].id,
        role: "teacher"
    };

    let tokens = generateTokens(user);

    try {
        await database.query('INSERT INTO refreshTokens (refreshToken) VALUES (?)', [tokens.refreshToken]);
    } catch (e) {
        return res.status(500).json({error: {type: "internalServerError", message: e}});
    } finally {

    }

    res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        name: teacher[0].name
    });
});

routerTeachers.get("/profile", authenticateToken, isTeacher, async (req, res) => {

    let teacherId = req.user.id;

    let teacher = null;
    try {
        teacher = await database.query('SELECT name,lastName,email,teachingStage,schoolType,schoolLocation,gender,experienceYears,community FROM teachers WHERE id = ?', [teacherId]);
    } catch (e) {
        return res.status(500).json({error: {type: "internalServerError", message: e}});
    } finally {

    }

    res.status(200).json(teacher[0]);
});

routerTeachers.put("/profile", authenticateToken, isTeacher, async (req, res) => {


    let {
        name,
        lastName,
        email,
        teachingStage,
        schoolType,
        schoolLocation,
        gender,
        experienceYears,
        community
    } = req.body;
    let teacherId = req.user.id;

    if (!name?.trim()) {
        return res.status(400).json({error: {name: "profile.error.name"}});
    }

    if (!lastName?.trim()) {
        return res.status(400).json({error: {lastName: "profile.error.lastName"}});
    }

    if (!email?.trim()) {
        return res.status(400).json({error: {email: "profile.error.email.mandatory"}});
    }

    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(400).json({error: {email: "profile.error.email.format"}});
    }

    let teacher = null;
    try {
        let teacherEmail = await database.query(
            'SELECT email FROM teachers WHERE email = ? AND id != ?',
            [email, teacherId]
        );

        if (teacherEmail.length > 0) {
            return res.status(404).json({error: {email: "profile.error.email.repeated"}});
        }

        teacher = await database.query(
            'UPDATE teachers \
            SET \
                name = IFNULL(?, name), \
                lastName = IFNULL(?, lastName), \
                email = IFNULL(?, email), \
                teachingStage = IFNULL(?, teachingStage), \
                schoolType = IFNULL(?, schoolType), \
                schoolLocation = IFNULL(?, schoolLocation), \
                gender = IFNULL(?, gender), \
                experienceYears = IFNULL(?, experienceYears), \
                community = IFNULL(?, community) \
            WHERE id = ?', [name, lastName, email, teachingStage, schoolType, schoolLocation, gender, experienceYears, community, teacherId]);
    } catch (e) {
        return res.status(500).json({error: {type: "internalServerError", message: e}});
    } finally {

    }

    res.status(200).json({updated: teacher});
});

routerTeachers.get("/checkLogin", authenticateToken, isTeacher, async (req, res) => {
    return res.status(200).json({user: req.user});
});

module.exports = routerTeachers;