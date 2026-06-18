// Global teardown for Playwright tests
const fs = require('fs').promises;
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Generate test summary
    const testResultsDir = path.join(__dirname, '..', 'test-results');
    const summaryFile = path.join(testResultsDir, 'test-summary.json');
    
    // Collect test artifacts information
    const screenshots = await getFileCount(path.join(testResultsDir, 'screenshots'));
    const videos = await getFileCount(path.join(testResultsDir, 'videos'));
    const apiReports = await getFileCount(path.join(testResultsDir, 'api-reports'));
    
    const summary = {
      teardownTime: new Date().toISOString(),
      artifacts: {
        screenshots,
        videos,
        apiReports
      },
      testResultsPath: testResultsDir
    };
    
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('📊 Test Summary:');
    console.log(`   Screenshots: ${screenshots}`);
    console.log(`   Videos: ${videos}`);
    console.log(`   API Reports: ${apiReports}`);
    console.log(`   Results saved to: ${testResultsDir}`);
    
    // Clean up old test artifacts (optional)
    await cleanupOldArtifacts(testResultsDir);
    
  } catch (error) {
    console.error('❌ Teardown error:', error.message);
  }
  
  console.log('✅ Global teardown completed');
}

async function getFileCount(directory) {
  try {
    const files = await fs.readdir(directory);
    return files.length;
  } catch (error) {
    return 0;
  }
}

async function cleanupOldArtifacts(testResultsDir, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
  try {
    const directories = ['screenshots', 'videos', 'api-reports'];
    const cutoffTime = Date.now() - maxAge;
    
    for (const dir of directories) {
      const fullPath = path.join(testResultsDir, dir);
      
      try {
        const files = await fs.readdir(fullPath);
        
        for (const file of files) {
          const filePath = path.join(fullPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old file: ${file}`);
          }
        }
      } catch (error) {
        // Directory might not exist, that's okay
        continue;
      }
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

module.exports = globalTeardown;

