# StudentClubs API 📚
API made to simulate a service for student clubs, with support for posts made to share information, and events.

## Usage
* Clone the repository, then run `npm install` to get the dependencies.
* Add a valid Postgres URL and secret for JWT to a `.env` file, as `DATABASE_URL` and `JWT_SECRET`
* Build the project with `npm run tsc` and run with `npm run start`. It will be hosted on port 3000 unless a `PORT` variable is provided on `.env`

## Routes
All routes are specified in the `/routes` directory. They use Zod for validation, and Prisma for database queries. Some queries are protected with middleware implemented in `utils.ts`.
### /api/auth
Routes for sessions and authentication. Accessed through `POST`.
* `/signup`: Create an account. Must provide name, email, password and confirmation, description is optional.
* `/login`: Log into the platform. Must provide email and password. Returns access token.

### /api/users
Holds only a route for updating user profile. Accesed through `PUT`.
* `/<userId>`: Must provide user password, as well as field(s) to update. Only name and description can be updated.

### /api/clubs
Routes for clubs.
* `GET /`: Get all clubs.
* `GET /<clubId>`: Get specific club.
* `POST /`: Create a club. Must specify name and description. Club is created with requester as member, admin and owner.
* `PUT /<clubId>`: Update a club.
* `DELETE /<clubId>`: Delete a club.
* `POST /<clubId>/members`: Add member to a club. Member ID must be included in request body.
* `DELETE /<clubId>/members/<memberID>`: Remove member from a club.

Same last two routes are implemented for `admins` as well.

Under `/api/clubs/<clubId>/posts` and `/api/clubs/<clubId>/events` are routes for accessing clubs' posts and events. They follow the structure of club routes, without member or admin routes.

For creating **posts**, a title and content must be specified, the rest of data is either added automatically or provided in the route. For creating **events**, a title, description and date must be specified.

## To Do
- [ ] Add more pagination and filters to general GET requests, like it was done for events.
- [ ] If possible, better type safety for request object when it's guaranteed that user will be logged in.
- [ ] Find a better (less repetitive) way to do error handling