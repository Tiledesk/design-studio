
import { Field, Form } from 'src/app/models/intent-model';

export class FormModelsFactory {

    getModels() {
        let models: Form[] = new Array() as Form[];
        // -------------------------------------
        // @ Base form
        // -------------------------------------
        let form_base = new Form();
        form_base.name = 'Base'
        form_base.id = 1
        form_base.cancelCommands = [];
        form_base.cancelReply = "";
        form_base.description = '"Base" model contains the following fields: user fullname, user email';
        form_base.fields = new Array() as Field[];
        // first nested JSON
        let field0 = new Field()
        field0.name = 'userFullname';
        field0.type = 'text';
        field0.label = 'What is your name?';
         // second nested JSON
        let field1 = new Field()
        field1.name = 'userEmail';
        field1.type = 'text';
        field1.regex = '^.{1,}$'
        //field1.regex = "/^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/";
        field1.label = "Hi ${userFullname}\n\nJust one last question\n\nYour email "
        field1.errorLabel = "${userFullname} this email address is invalid\n\nCan you insert a correct email address?"
        form_base.fields.push(field0)
        form_base.fields.push(field1)

        // -------------------------------------
        // @ Advanced form
        // -------------------------------------
        let form_advanced = new Form();
        form_advanced.name = 'Advanced'
        form_advanced.id = 2
        form_advanced.cancelCommands = [];
        form_advanced.cancelReply = "";
        form_advanced.description = '"Advanced" model contains the following fields: user fullname, company name, user phone, user email';
        form_advanced.fields = new Array() as Field[];
        let field2 = new Field()
        field2.name = 'userFullname';
        field2.type = 'text';
        field2.label = 'What is your name?';
        let field3 = new Field()
        field3.name = 'companyName';
        field3.type = 'text';
        field3.label = 'Thank you ${userFullname}! What is your Company name?';
        let field4 = new Field()
        field4.name = 'userPhone';
        field4.type = 'text';
        field4.label = 'Thank you ${userFullname}!  What is your phone number?';
        let field5 = new Field()
        field5.name = 'userEmail';
        field5.type = 'text';
        field5.label =  "Hi ${userFullname} \n\nJust one last question\n\nYour email 🙂";
        field5.regex = '^.{1,}$'
        //field5.regex = "/^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/"
        field5.errorLabel = "${userFullname} this email address is invalid\n\nCan you insert a correct email address?";
        form_advanced.fields.push(field2)
        form_advanced.fields.push(field3)
        form_advanced.fields.push(field4)
        form_advanced.fields.push(field5)


        let form_custom = new Form();
        form_custom.name = 'Custom'
        form_custom.id = 3
        form_custom.cancelCommands = [];
        form_custom.cancelReply = "";
        form_custom.description = '"Custom" model is empty';
        form_custom.fields = new Array() as Field[];


        //let item = { "id": "custom-model", "name": "Custom", "description_key": "", "fields": "" };



        models.push(form_base);
        models.push(form_advanced); 
        models.push(form_custom);

        return models;
    }

    // modelsOfForm: Form[] = [
    //     {
    //         "name": "Base",
    //         "id": 1,

    //         "cancelCommands": [],
    //         "cancelReply": "",
    //         "fields": [
    //             {
    //                 "name": "userFullname",
    //                 "type": "text",
    //                 "label": "What is your name?"
    //             }, {
    //                 "name": "userEmail",
    //                 "type": "text",
    //                 "regex": "/^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/",
    //                 "label": "Hi ${userFullname}\n\nJust one last question\n\nYour email 🙂",
    //                 "errorLabel": "${userFullname} this email address is invalid\n\nCan you insert a correct email address?"
    //             }
    //         ]
    //     },
    //     {
    //         "name": "Advanced",
    //         "id": 2,

    //         "cancelCommands": [],
    //         "cancelReply": "",
    //         "fields": [
    //             {
    //                 "name": "userFullname",
    //                 "type": "text",
    //                 "label": "What is your name?"
    //             }, {
    //                 "name": "companyName",
    //                 "type": "text",
    //                 "label": "Thank you ${userFullname}! What is your Company name?"
    //             }, {
    //                 "name": "userPhone",
    //                 "type": "text",
    //                 "label": "Thank you ${userFullname}! What is your phone number?"
    //             }, {
    //                 "name": "userEmail",
    //                 "type": "text",
    //                 "regex": "/^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/",
    //                 "label": "Hi ${userFullname} \n\nJust one last question\n\nYour email 🙂",
    //                 "errorLabel": "${userFullname} this email address is invalid\n\nCan you insert a correct email address?"
    //             }
    //         ]
    //     }
    // ]

   

}
