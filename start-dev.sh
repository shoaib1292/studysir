#!/bin/bash
cd /home/z/my-project
exec bun x next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
