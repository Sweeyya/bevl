---
id: dev-server-ports
kind: note
title: Run the dev server on an explicit port
tags: dev-server, ports, check, shots, workflow
---
Start the dev server with an explicit free port and --strictPort, for example pnpm dev --port 4420 --strictPort. Use the same URL for check and shots. Run it in the background and stop it when done.

check takes 20 to 60 seconds and prints nothing meanwhile, so wait for it.
