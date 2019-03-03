# Pirple NodeJS masterclass homework assignment 02.

## Introduction

### The Assignment (Scenario)

You are building the API for a pizza-delivery company. Don't worry about a frontend, just build the API. Here's the spec from your project manager: 

1. New users can be created, their information can be edited, and they can be deleted. We should store their name, email address, and street address.

2. Users can log in and log out by creating or destroying a token.

3. When a user is logged in, they should be able to GET all the possible menu items (these items can be hardcoded into the system). 

4. A logged-in user should be able to fill a shopping cart with menu items

5. A logged-in user should be able to create an order. You should integrate with the Sandbox of Stripe.com to accept their payment. Note: Use the stripe sandbox for your testing. Follow this link and click on the "tokens" tab to see the fake tokens you can use server-side to confirm the integration is working: https://stripe.com/docs/testing#cards

6. When an order is placed, you should email the user a receipt. You should integrate with the sandbox of Mailgun.com for this. Note: Every Mailgun account comes with a sandbox email account domain (whatever@sandbox123.mailgun.org) that you can send from by default. So, there's no need to setup any DNS for your domain for this task https://documentation.mailgun.com/en/latest/faqs.html#how-do-i-pick-a-domain-name-for-my-mailgun-account

This is an open-ended assignment. 
You may take any direction you'd like to go with it, as long as your project includes the requirements. 
It can include anything else you wish as well. 
And please: Don't forget to document how a client should interact with the API you create!


## API definition

### Users 

### Creating user:
- Path: /users
- Method: POST
- Request body:

```javascript
{
  "password": "*****",
  "firstName": "userFirstName",
  "lastName": "userLastName",
  "email": "user@host.com",
  "address": "User Home Address"  
}
```
Response: 
  200 - Success (Newly created object without the Password information);
  400 - Wrong input data;
  401 - User already exists;
  500 - Could not hash the password
  500 - Could not create a new user

### Getting user information:
- Path: /users
- Method: GET
- Parameters:
  - eMail - user Email
- Headers:
  - token - generated token

Response: 
  200 - Success (User information);
  400 - Wrong input data;
  401 - Missing required token in the header, or the token is not valid;
  404 - No user found;

### Updating user information:
- Path: /users
- Method: PUT
- Headers:
  - token - generated token
- Request body:

```javascript
{
  "password": "*****",
  "firstName": "userFirstName", // (optional)
  "lastName": "userLastName", // (optional)
  "email": "user@host.com", // (optional)
  "address": "User Home Address" // (optional) 
}
```
(at least one optional field should be provided)

Response: 
  200 - Success (User information);
  400 - Wrong input data;
  400 - At least one field to update should be provided;
  401 - Missing required token in the header, or the token is not valid;
  404 - User not found;
  500 - Could not update the user;

### Removing user information:
- Path: /users
- Method: DELETE
- Parameters:
  - eMail - user Email
- Headers:
  - token - generated token

Response: 
  200 - Success (User deleted);
  400 - Wrong input data;
  401 - Missing required token in the header, or the token is not valid;
  404 - No user found;
  500 - Could not delete the user;


### Tokens 

### Creating token:
- Path: /tokens
- Method: POST
- Request body:

```javascript
{
  "email": "user@host.com",
  "password": "*****",
}
```
Response: 
  200 - Success (Newly created token);
  400 - Wrong input data;
  401 - User not found;
  401 - The password provided did not matches the specified user's stored
  500 - Could not hash the password
  500 - Could not create a new token

### Getting token info:
- Path: /tokens
- Method: GET
- Parameters:
  - id - token value

Response: 
  200 - Success (Found token object);
  400 - Wrong input data;
  401 - Ivalid token; 

### Updating token expiration:
- Path: /tokens
- Method: PUT
- Request body:

```javascript
{
  "id": "4pfrs92wwodq6zv79mag",
  "extend": True
}
```
Response: 
  200 - Success (Token updated);
  400 - Wrong input data;
  401 - Invalid token; 
  401 - The token has already expired and cannot be restored;
  500 - Could not update the token's expiration;

### Removing token information:
- Path: /tokens
- Method: DELETE
- Parameters:
  - id - token value

Response: 
  200 - Success (User deleted);
  400 - Wrong input data;
  401 - A token does not exist;
  500 - Could not delete specified token;


### Menu 

### Getting menu:
- Path: /menu
- Method: GET
- Parameters: none
- Headers:
  - token - generated valid token

Response: 
  200 - Success (menu json structure);
  
Example:

```javascript
[
  {
    id: 1,
    name: 'Margherita',
    price: 5.0
  },
  {
    id: 2,
    name: 'Marinara',
    price: 6.5
  },
  ...
]
```

### Shopping cart 

### Creating new cart (or replacing existing one):
- Path: /cart
- Method: POST
- Request body (example):

```javascript
[
  {
    "menuItemID": 1,
    "name": "Margherita",
    "qty": 21,
    "price": 5
  },
  {
    "menuItemID": 2,
    "name": "Marinara",
    "qty": 1,
    "price": 5.5
  }
]
```
Response: 
  200 - Success (Newly created token);
  400 - Wrong input data;
  401 - User not found;
  401 - The password provided did not matches the specified user's stored
  500 - Could not hash the password
  500 - Could not create a new token