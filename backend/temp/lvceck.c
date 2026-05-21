#include <stdio.h>

int main() {
    int num1, num2;
    printf("Enter 1st number: ");
     fflush(stdout); scanf("%d", &num1);
    printf("Enter 2nd number: ");
     fflush(stdout); scanf("%d", &num2);
    printf("Result is: %d\n", num1 + num2);
     fflush(stdout); return 0;
}