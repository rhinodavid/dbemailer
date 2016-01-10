var request = require('supertest');

var app = require('./app');

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/dbemailer');


var faker = require('faker');


describe('Requests to the root path', function(){
        it('Returns a 200 status code', function(done){
                request(app)
                        .get('/')
                                .expect(200, done);
        });

        it('Asks for your email', function (done){
                request(app)
                        .get('/')
                        .expect(/email address/, done);
        })
});


describe('Creating a new user with valid email', function(){

        afterEach(function(){
                //clean up test entry
                var collection = db.get('usercollection');
                collection.remove({"email": "testeremail@gmail.com"});
        });

        it('Returns a 201 status code', function (done){
                request(app)
                        .post('/users')
                        .send('email=testeremail%40gmail.com&name=beke')
                        .expect(201, done);
        });

        it('Returns the JSON ID', function (done){
                request(app)
                        .post('/users')
                        .send('email=testeremail%40gmail.com&name=beke')
                        .expect(/_id/, done);
        });
});

describe('Getting a user by ID', function(){
        var id = mongo.ObjectID();
        var email = faker.internet.email();
        var name = faker.name.firstName();
        before(function(){
                var collection = db.get('usercollection');
                collection.insert({"_id": id, "email": email, "name": name}, function(error, doc){
                        if (error) throw error;
                });
        });

        after(function(){
                var collection = db.get('usercollection');
                collection.remove({"email": email});
        });

        it('Returns a 200 status code', function (done){
                request(app)
                        .get('/users/' + id)
                        .expect(200, done);
        });

        it('Returns a JSON object with the users data', function (done) {
                request(app)
                        .get('/users/' + id)
                        .expect(RegExp(email), done)
        });

});

describe('Getting the list of users (JSON)', function(){
        var id1 = mongo.ObjectID();
        var email1 = faker.internet.email();
        var name1 = faker.name.firstName();

        var id2 = mongo.ObjectID();
        var email2 = faker.internet.email();
        var name2 = faker.name.firstName();

        var id3 = mongo.ObjectID();
        var email3 = faker.internet.email();
        var name3 = faker.name.firstName();

        var collection = db.get('usercollection');

        before(function(){
                collection.insert({"_id": id1, "email": email1, "name": name1, "status": "pending-user"}, function(error, doc){
                        if (error) throw error;
                });
                collection.insert({"_id": id2, "email": email2, "name": name2, "status": "pending-user"}, function(error, doc){
                        if (error) throw error;
                });
                collection.insert({"_id": id3, "email": email3, "name": name3, "status": "pending-user"}, function(error, doc){
                        if (error) throw error;
                });
        });

        after(function(){
                collection.remove({"_id": id1});
                collection.remove({"_id": id2});
                collection.remove({"_id": id3});
        });

        it('Returns a 200 status code', function (done){
                request(app)
                .get('/users')
                .expect(200, done);
        });

        it('Returns the users', function (done){
                request(app)
                .get('/users')
                .expect(RegExp(email2))
                .expect(RegExp(name1))
                .expect(/status/, done);
        });
});

describe('Updating a user (PUT to users/:id)', function(){
        var id1 = mongo.ObjectID();
        var email1 = faker.internet.email();
        var name1 = faker.name.firstName();

        var collection = db.get('usercollection');

        beforeEach(function(){
                collection.insert({"_id": id1, "email": email1, "name": name1, "status": "pending-admin"}, function(error, doc){
                        if (error) throw error;
                });
        });

        afterEach(function(){
                collection.remove({"_id": id1});
        });

        it('Returns a 200 status code', function(done){
                request(app)
                .put('/users/'+id1)
                .send({"status": "confirmed"})
                .expect(200, done);
        });
        it('Returns an updated user object', function(done){
                request(app)
                .put('/users/'+id1)
                .send({"status": "confirmed"})
                .expect(/confirmed/)
                .expect(RegExp(name1), done);
        });
});

describe('Deleting a user', function(){
        var id1 = mongo.ObjectID();
        var email1 = faker.internet.email();
        var name1 = faker.name.firstName();

        var collection = db.get('usercollection');

        beforeEach(function(){
                collection.insert({"_id": id1, "email": email1, "name": name1, "status": "pending-admin"}, function(error, doc){
                        if (error) throw error;
                });
        });

        afterEach(function(){
                //remove the new user in case the route didn't work correctly
                collection.remove({"_id": id1});
        });

        it('Returns a 204 status code', function(done){
                request(app)
                .delete('/users/'+id1)
                .expect(204, done);
        });
});