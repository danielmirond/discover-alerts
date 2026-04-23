# Self-hosted runner for polling jobs

Use this runner for scheduled polling workflows so they do not consume GitHub-hosted Actions minutes.

## 1. Create the VPS

Recommended starting point:

- Ubuntu 24.04 LTS
- 2 vCPU
- 4 GB RAM
- 40 GB disk or more

## 2. Install system dependencies

```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

## 3. Add the GitHub runner

In GitHub, open:

`Settings -> Actions -> Runners -> New self-hosted runner`

Choose Linux x64 and run the generated commands on the VPS.

When GitHub asks for labels, add:

```text
polls
```

The final labels should include:

```text
self-hosted
linux
x64
polls
```

## 4. Install the runner as a service

From the runner directory on the VPS:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

## 5. Validate one workflow

Run one polling workflow manually from GitHub Actions with `workflow_dispatch`.

Start with:

```text
Discover Poll
```

If it completes, the rest of the polling workflows should use the same runner automatically.

## Notes

- Keep `publish-content.yml` on GitHub-hosted runners until the polling migration is stable.
- Do not use this runner for untrusted pull request workflows from forks.
- If jobs queue forever, check that the runner is online and has the `polls` label.
