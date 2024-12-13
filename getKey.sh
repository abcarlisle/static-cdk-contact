cdk deploy ContactStack -O ./contactStack.out --require-approval never
API_KEY=$(jq -r ".ContactStack.APIKeyID" ./contactStack.out)
echo ${API_KEY}
ENDPOINT=$(jq -r ".ContactStack.EmailApiEndpoint2C21ACE3" ./contactStack.out)
echo ${ENDPOINT}


KEY=$(aws apigateway get-api-key --api-key ${API_KEY} --include-value --query "value" --output text)
echo ${KEY}


jq -n '{ "contactKey": "'"$KEY"'", "contactEndpoint": "'"$ENDPOINT"'" }' > ../portfolio/.key.json

