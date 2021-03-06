
test-cov: istanbul coveralls codeclimate

istanbul:
	istanbul cover -x "tmp/**" -x "bin/install_prerequisite.js" ./node_modules/mocha/bin/_mocha -- -R spec --recursive --timeout 100000 --bail test

coveralls: istanbul
	cat ./coverage/lcov.info | coveralls --exclude tmp

# note a CODECLIMATE_REPO_TOKEN must be specified as an environment variable.
codeclimate: istanbul
	codeclimate-test-reporter < ./coverage/lcov.info

