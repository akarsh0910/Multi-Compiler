const { exec } = require('child_process');
const fs = require('fs');

let code = `
public class SomeClass {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}
`;

const uuid = "abc12345";
code = code.replace(/(?:public\s+)?class\s+([a-zA-Z_$][a-zA-Z\\d_$]*)/, `public class Class_${uuid}`);

fs.writeFileSync(`Class_${uuid}.java`, code);

exec(`javac Class_${uuid}.java`, (err, stdout, stderr) => {
    if(err) console.error(err, stderr);
    else {
        exec(`java Class_${uuid}`, (e, so, se) => {
            console.log("OUT:", so);
        });
    }
});
