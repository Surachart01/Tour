#!/usr/bin/env node

// Quick debug script to analyze the hotel form structure
const { chromium } = require('playwright');

async function debugHotelForm() {
  console.log('🔍 Analyzing hotel form structure...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to add hotel page
    await page.goto('http://127.0.0.1:8080/production/add_hotel.html');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Loaded add hotel page');
    
    // Analyze form fields
    const formFields = await page.evaluate(() => {
      const fields = {};
      
      // Get all input, select, and textarea elements
      const elements = document.querySelectorAll('input, select, textarea');
      
      elements.forEach(el => {
        if (el.id) {
          fields[el.id] = {
            type: el.type || el.tagName.toLowerCase(),
            placeholder: el.placeholder || '',
            required: el.required,
            className: el.className
          };
        }
      });
      
      return fields;
    });
    
    console.log('\n📋 Form Fields Analysis:');
    Object.entries(formFields).forEach(([id, info]) => {
      console.log(`  ${id}: ${info.type} ${info.required ? '(required)' : ''} - "${info.placeholder}"`);
    });
    
    // Check for modals
    const modals = await page.evaluate(() => {
      const modalElements = document.querySelectorAll('.modal');
      const modals = [];
      
      modalElements.forEach(modal => {
        const id = modal.id;
        const title = modal.querySelector('.modal-title')?.textContent || '';
        modals.push({ id, title });
      });
      
      return modals;
    });
    
    console.log('\n🪟 Available Modals:');
    modals.forEach(modal => {
      console.log(`  ${modal.id}: "${modal.title}"`);
    });
    
    // Check for buttons
    const buttons = await page.evaluate(() => {
      const buttonElements = document.querySelectorAll('button');
      const buttons = [];
      
      buttonElements.forEach(btn => {
        const id = btn.id || '';
        const text = btn.textContent?.trim() || '';
        const dataTarget = btn.getAttribute('data-target') || '';
        if (id || text || dataTarget) {
          buttons.push({ id, text, dataTarget });
        }
      });
      
      return buttons;
    });
    
    console.log('\n🔘 Important Buttons:');
    buttons.forEach(btn => {
      if (btn.text.includes('Save') || btn.text.includes('Submit') || btn.text === '+' || btn.dataTarget) {
        console.log(`  ${btn.id || 'no-id'}: "${btn.text}" ${btn.dataTarget ? `-> ${btn.dataTarget}` : ''}`);
      }
    });
    
    console.log('\n✅ Analysis complete! Press any key to close...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', resolve);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the debug script
debugHotelForm().catch(console.error);


