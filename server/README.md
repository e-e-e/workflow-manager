# Server

## Setup

### Requirements

#### Dependencies

- nodejs v16+
- yarn

#### Environment variables

To run this project you need to supply environment variables:
- `GITHUB_CLIENT_ID` - Github oauth app id
- `GITHUB_CLIENT_SECRET` - Github oauth app secret
- `SESSION_SECRETS` - comma separated list of secrets for encoding cookies, eg: "key1,key2"
- `PORT` (optional) - optionally set the servers port, defaults to 3000

You can optionally configure these by adding a `.env` file to this directory.

### Install and startup

Install project dependencies. This may also be run from the root of this repository to install dependencies for both
server and client.

```bash
yarn install
```

#### Start the server

```bash
yarn start
```

#### Development

Run in watch mode for development

```bash
yarn dev
```



