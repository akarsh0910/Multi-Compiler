#include <stdio.h>
#include <stdlib.h>
#define printf(...) (printf(__VA_ARGS__), fflush(stdout))

int main() { if(1) printf("Hello"); else printf("World"); }