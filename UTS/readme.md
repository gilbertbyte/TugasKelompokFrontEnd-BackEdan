# UTS

## How to run da app

1. Go to the `UTS` folder.
2. Run:

```bash
npm install
```

3. Edit the `.env` file and set the `Session secret` value. Generate a secure random string with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Put the generated string in the `.env` file.
5. Seed the admin account:

```bash
npm run seed
```

6. Start the app:

```bash
npm start
```
deploy trigger

tester