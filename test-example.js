// Test file demonstrating JavaScript Standard Style formatting with Biome
var message = 'Hello World'
var numbers = [1, 2, 3, 4, 5]

function testFunction(x, y) {
  if (x == 'test') {
    console.log(message)
    return x + y
  }
  return x * y
}

const result = testFunction('test', 5)
console.log(result)

export { testFunction, message }
