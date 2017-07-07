# accounto
Create Google groups from the CLI

## Install
```
npm install -g accounto
```

Requires node >= 6.

## Create a group

```
accounto new --name <group_name>
```

This creates a group named `<group_name>` with the primary email `<group_name>@<your_domain>`.

You can optionally specify an email different than the name with

```
accounto new --name <group_name> --email <email>
```
