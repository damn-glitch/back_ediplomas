const router = require('express').Router();

module.exports = (db) => router.get('/', async (req, res) => {
    // db.query(`drop table if exists temp_table`)
    // EXPLANATION?
    const file = require('../data_back.json');
    for (let i = 540; i < file.length; i++) {
        let fullname_kz = (file[i]["Fullname_kz"]).trim();
        let Fullname_en = (file[i]["Fullname_eng"]).trim();
        let year = (file[i]["Year"].split(", ")[1]).trim();

        year = (!year || year == "" || year == "-") ? 0 : parseInt(year);
       
        let degree = (file[i]["Degree"].split(" степень ")[1]).trim();
        let speciality = (file[i]["speciality"].split("«")[1].split("»")[0]).trim();
        let gpa = (file[i]["GPA"] ?? "");

        gpa = (!gpa || gpa == "" || gpa == "-") ? 0 : parseFloat(gpa);

        let iin = (file[i]["IIN"] ?? "").toString();
        let region = ((file[i]["Region"] && file[i]["Region"].length > 3) ? file[i]["Region"] && file[i]["Region"] : file[i]["Region2"]) ?? "";
        let mobile = ((file[i]["mobile"] ? file[i]["mobile"] : "") ?? "");
        let email = ((file[i]["email"] ? file[i]["email"]: "") ?? "");
        const query =
            `INSERT INTO graduates 
            (fullNameEng, fullNameKz, major, speciality, IIN, university_id, gpa, year, region, mobile, email) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
        const values = [
            Fullname_en,
            fullname_kz,
            degree,
            speciality,
            iin,
            1,
            gpa,
            year,
            region,
            mobile,
            email,
        ];
        db.query(query, values, (err, result) => {
            if (err) {

                console.log(fullname_kz);
                console.log(Fullname_en);
                console.log(year);
                console.log(degree);
                console.log(speciality);
                console.log(gpa);
                console.log(iin);
                console.log(region);
                console.log(mobile);
                console.log(email);
                console.log("--------------------------------")
                console.error('Error inserting data:', err);
                return;
            }
            console.log(i + ': Data inserted successfully!');
        });

    }
});