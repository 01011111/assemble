# Assemble!

## Usage

### Configuration File

Create a `assemble.yml` file in your repository.

There's 2 sections to it: teams and access.

The Teams section will create teams in your organization that is listed in the file but is missing from the organization.  
It **will not** delete teams that exist but are not present in the file.

The Access section will grant access to listed teams with specific permission to listed repositories.  
If you want to grant access too all repositories, you can use `'*'` for the name of the repository (don't forget the quotes or yaml will not consider it a string).

#### Example

```yaml
teams:
  - Admin
  - BackEnd
  - DevOps
  - FronEnd
  - QA
  - Mobile

access:
  '*':
    - team: Admin
      permission: admin
    - team: QA
      permission: pull

  my_repo:
    - team: BackEnd
      permission: maintain
    - team: DevOps
      permission: push
    - team: QA
      permission: triage


```

### GitHub Workflow

Create a GitHub Workflow with a content similar to this:

```yaml
name: Check GH Teams

on:
  workflow_dispatch:
  schedule:
    - cron: '37 13 * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: 01011111/assemble@v1.2
        with:
          token: ${{ secrets.ORG_TOKEN }}

```

### Using a different file

You can reference a different file for the configuration - but the content has to be yaml.

Just add an input in the workflow:

```yaml
uses: 01011111/assemble@v1.2
  with:
    token: ${{ secrets.ORG_TOKEN }}
    config: './github_teams.yaml'

```
