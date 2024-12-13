
"""
cdk deploy ContactStack -O ./contactStack.out --require-approval never
API_KEY=$(jq ".ContactStack.APIKeyID" ./contactStack.out)
ENDPOINT=$(jq ".ContactStack.EmailApiEndpoint2C21ACE3" ./contactStack.out)


KEY=$(aws apigateway get-api-key --api-key ${API_KEY} --include-value --query "value" --output text)


jq -n '{ "contactKey": ${KEY}, "contactEndpoint": ${ENDPOINT} }' > ../portfolio/.key.json
"""


import subprocess
import json
import os

# CDK deploy
subprocess.run([r""])#, "deploy", "ContactStack", "-O", "./contactStack.out", "--require-approval", "never"])

## Extract API key and endpoint from output file
#with open("./contactStack.out", "r") as f:
#    output = json.load(f)
#api_key = output["ContactStack"]["APIKeyID"]
#endpoint = output["ContactStack"]["EmailApiEndpoint2C21ACE3"]
#
## Get API key value using AWS CLI
#key = subprocess.run(["aws", "apigateway", "get-api-key", "--api-key", api_key, "--include-value", "--query", "value", "--output", "text"], capture_output=True, text=True).stdout.strip()
#
## Create JSON file with contact key and endpoint
#with open("../portfolio/.key.json", "w") as f:
#    json.dump({"contactKey": key, "contactEndpoint": endpoint}, f)