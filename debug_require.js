const fs = require('fs');
const log = (msg) => fs.appendFileSync('debug_output.txt', msg + '\n');

try {
    log("Requiring constants...");
    require('./src/constants');
    log("Requiring typeUtils...");
    require('./src/utils/typeUtils');
    log("Requiring layoutUtils...");
    require('./src/utils/layoutUtils');
    log("Requiring fieldParser...");
    require('./src/parsers/fieldParser');
    log("Requiring structAnalyzer...");
    require('./src/structAnalyzer');
    log("All required successfully.");
} catch (e) {
    log("Error: " + e.message);
    log(e.stack);
}
