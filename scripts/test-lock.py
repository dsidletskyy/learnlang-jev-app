#!/usr/bin/env python3
"""Serialize supported workflows that mutate the dedicated test database."""
import fcntl
import os
import signal
import subprocess
import sys

args = sys.argv[1:]
lock_path = '/tmp/language-learning-test-database-55432.lock'
# Alternate paths are for testing the lock itself, not supported test workflows.
if args[:1] == ['--lock-path']:
    lock_path, args = args[1], args[2:]
with open(lock_path, 'a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit('another database test run is active; stop it and retry.')
    child = subprocess.Popen(args, pass_fds=(lock.fileno(),), start_new_session=True)
    def forward(signum, _frame):
        try:
            os.killpg(child.pid, signum)
        except ProcessLookupError:
            pass
    signal.signal(signal.SIGTERM, forward)
    signal.signal(signal.SIGINT, forward)
    sys.exit(child.wait())
